import time
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.attendance import Attendance, AttendanceStatus
from app.models.exam import Mark
from app.models.assignment import Assignment, Submission
from app.models.user import User
from app.config import settings
from typing import Optional

# TTL cache: {student_id: (unix_timestamp, stats_dict)}
_stats_cache: dict[int, tuple[float, dict]] = {}
_CACHE_TTL = 300  # 5 minutes


def invalidate_student_cache(student_id: int) -> None:
    """Call this when attendance/marks/submissions are updated for a student."""
    _stats_cache.pop(student_id, None)


def _get_student_stats(student_id: int, db: Session) -> dict:
    now = time.time()
    cached = _stats_cache.get(student_id)
    if cached and (now - cached[0]) < _CACHE_TTL:
        return cached[1]

    total = db.query(func.count(Attendance.id)).filter(
        Attendance.student_id == student_id
    ).scalar() or 0
    present = db.query(func.count(Attendance.id)).filter(
        Attendance.student_id == student_id,
        Attendance.status.in_(["present", "late", "PRESENT", "LATE"]),
    ).scalar() or 0
    att_pct = round((present / total) * 100, 2) if total > 0 else 0.0

    avg_result = db.query(func.avg(Mark.marks_obtained)).filter(
        Mark.student_id == student_id
    ).scalar()
    avg_marks = round(float(avg_result), 2) if avg_result else 0.0

    all_assignments = db.query(func.count(Assignment.id)).filter(
        Assignment.is_active == True
    ).scalar() or 0
    submitted = db.query(func.count(Submission.id)).filter(
        Submission.student_id == student_id
    ).scalar() or 0
    assign_pct = round((submitted / all_assignments) * 100, 2) if all_assignments > 0 else 0.0

    result = {"attendance_pct": att_pct, "avg_marks": avg_marks,
              "assignment_pct": assign_pct, "total_classes": total, "present": present}
    _stats_cache[student_id] = (now, result)
    return result


def predict_performance(student_id: int, db: Session) -> dict:
    """Random Forest — classifies student performance level."""
    stats = _get_student_stats(student_id, db)
    from app.services.ml_service import predict_performance_ml
    ml = predict_performance_ml(
        stats["attendance_pct"], stats["avg_marks"], stats["assignment_pct"]
    )
    return {
        "student_id": student_id,
        "attendance_percentage": stats["attendance_pct"],
        "average_marks": stats["avg_marks"],
        "assignment_completion": stats["assignment_pct"],
        **ml,
    }


def get_grade_prediction(student_id: int, db: Session) -> dict:
    """Linear Regression — predicts final exam marks from current stats."""
    stats = _get_student_stats(student_id, db)
    from app.services.ml_service import predict_grade_lr
    result = predict_grade_lr(
        stats["attendance_pct"], stats["avg_marks"], stats["assignment_pct"]
    )
    return {
        "student_id": student_id,
        "attendance_percentage": stats["attendance_pct"],
        "average_marks": stats["avg_marks"],
        "assignment_completion": stats["assignment_pct"],
        **result,
    }


def get_ai_recommendations(student_id: int, db: Session) -> dict:
    stats = _get_student_stats(student_id, db)
    att_pct, avg_marks, assign_pct = stats["attendance_pct"], stats["avg_marks"], stats["assignment_pct"]

    recommendations = []
    warnings = []

    if att_pct < 75:
        warnings.append(f"Your attendance is {att_pct}% - below the 75% minimum requirement.")
        recommendations.append("Attend classes regularly to avoid shortage.")
        recommendations.append("Contact your teacher if you have valid reasons for absence.")

    if avg_marks < 60:
        warnings.append(f"Your average marks are {avg_marks}% - needs improvement.")
        recommendations.append("Practice previous year papers.")
        recommendations.append("Revise weak subjects daily.")
        recommendations.append("Attend doubt-clearing sessions.")

    if assign_pct < 75:
        warnings.append(f"Only {assign_pct}% assignments submitted.")
        recommendations.append("Complete and submit pending assignments on time.")

    if not warnings:
        recommendations.append("Keep up the excellent work!")
        recommendations.append("Consider helping peers who may be struggling.")

    # Try NVIDIA Nemotron first, fallback to Gemini
    ai_suggestion = _get_nvidia_insight(att_pct, avg_marks, assign_pct) or _get_gemini_insight(att_pct, avg_marks, assign_pct)
    if ai_suggestion:
        recommendations.append(ai_suggestion)

    return {
        "student_id": student_id, "warnings": warnings,
        "recommendations": recommendations,
        "attendance_percentage": att_pct, "average_marks": avg_marks,
        "assignment_completion": assign_pct,
    }


def chat_with_ai(message: str, user: User, db: Session) -> str:
    context = _build_student_context(user, db)
    
    # 1. First try NVIDIA Nemotron
    nvidia_response = _query_nvidia(message, context)
    if nvidia_response:
        return nvidia_response

    # 2. Fallback to Gemini
    gemini_response = _query_gemini(message, context)
    if gemini_response:
        return gemini_response

    # 3. Fallback to rule-based
    return _rule_based_chat(message, user, db)


def _build_student_context(user: User, db: Session) -> str:
    if user.role.value != "student":
        return f"User: {user.full_name}, Role: {user.role.value}"
    stats = _get_student_stats(user.id, db)
    return (
        f"Student: {user.full_name}\n"
        f"Attendance: {stats['attendance_pct']}%\n"
        f"Average Marks: {stats['avg_marks']}%\n"
        f"Assignment Completion: {stats['assignment_pct']}%\n"
    )


def _query_nvidia(message: str, context: str) -> Optional[str]:
    """Query NVIDIA NIM API (e.g. nvidia/nemotron-3.5-lightning-30b-a3b)."""
    if not settings.nvidia_api_key:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=settings.nvidia_api_key
        )
        prompt = (
            f"You are an AI assistant for a College Student Management System.\n"
            f"Student context:\n{context}\n\n"
            f"Student asks: {message}\n\n"
            f"Provide a helpful, friendly, and concise response (2-3 sentences max)."
        )
        completion = client.chat.completions.create(
            model=settings.nvidia_model or "nvidia/nemotron-3.5-lightning-30b-a3b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            top_p=0.95,
            max_tokens=1024,
        )
        if completion.choices and completion.choices[0].message.content:
            return completion.choices[0].message.content.strip()
        return None
    except Exception as e:
        logger.warning(f"NVIDIA Nemotron chat query failed: {e}")
        return None


def _get_nvidia_insight(att_pct: float, avg_marks: float, assign_pct: float) -> Optional[str]:
    """Generate study insight using NVIDIA Nemotron."""
    if not settings.nvidia_api_key:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=settings.nvidia_api_key
        )
        prompt = (
            f"Student: attendance {att_pct}%, avg marks {avg_marks}%, "
            f"assignment completion {assign_pct}%. "
            f"Give ONE specific, highly actionable study tip in 1 clear sentence."
        )
        completion = client.chat.completions.create(
            model=settings.nvidia_model or "nvidia/nemotron-3.5-lightning-30b-a3b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            max_tokens=256,
        )
        if completion.choices and completion.choices[0].message.content:
            return completion.choices[0].message.content.strip()
        return None
    except Exception as e:
        logger.warning(f"NVIDIA Nemotron insight failed: {e}")
        return None


def _query_gemini(message: str, context: str) -> Optional[str]:
    if not settings.gemini_api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = (
            f"You are an AI assistant for a Student Management System.\n"
            f"Student context:\n{context}\n\n"
            f"Student asks: {message}\n\n"
            f"Provide a helpful, concise response (2-3 sentences max)."
        )
        response = model.generate_content(prompt)
        return response.text
    except Exception:
        return None


def _get_gemini_insight(att_pct: float, avg_marks: float, assign_pct: float) -> Optional[str]:
    if not settings.gemini_api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = (
            f"Student: attendance {att_pct}%, avg marks {avg_marks}%, "
            f"assignment completion {assign_pct}%. "
            f"Give ONE specific, actionable study tip in 1 sentence."
        )
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception:
        return None


def _rule_based_chat(message: str, user: User, db: Session) -> str:
    msg = message.lower()
    if any(w in msg for w in ["attendance", "present", "absent"]):
        if user.role.value == "student":
            records = db.query(Attendance).filter(Attendance.student_id == user.id).all()
            total = len(records)
            present = sum(1 for r in records if r.status.value in ("present", "late"))
            pct = round((present / total) * 100, 2) if total > 0 else 0
            return f"Your attendance is {pct}% ({present}/{total} classes attended)."
        return "Please log in as a student to see attendance."

    if any(w in msg for w in ["marks", "score", "grade", "result"]):
        if user.role.value == "student":
            marks = db.query(Mark).filter(Mark.student_id == user.id).all()
            if not marks:
                return "No marks recorded yet."
            avg = round(sum(m.marks_obtained for m in marks) / len(marks), 2)
            return f"You have {len(marks)} exam result(s). Your average score is {avg}%."
        return "Please log in as a student to see marks."

    if any(w in msg for w in ["assignment", "homework"]):
        if user.role.value == "student":
            total = db.query(Assignment).filter(Assignment.is_active == True).count()
            submitted = db.query(Submission).filter(Submission.student_id == user.id).count()
            return f"There are {total} active assignments. You have submitted {submitted}."
        return "Assignment info is available in the Assignments section."

    if any(w in msg for w in ["fee", "payment", "dues"]):
        if user.role.value == "student":
            from app.models.fee import Fee
            fees = db.query(Fee).filter(Fee.student_id == user.id).all()
            pending = sum(f.amount for f in fees if f.status.value != "paid")
            return f"You have pending fees of Rs {pending:.0f}."
        return "Fee information is in the Fees section."

    return (
        "I can help with attendance, marks, assignments, fees, and study tips. "
        "What would you like to know?"
    )

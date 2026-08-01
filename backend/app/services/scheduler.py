import logging
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import func
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.attendance import Attendance, AttendanceStatus
from app.models.student import StudentProfile
from app.services.notification_service import create_notification

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler()


def _check_low_attendance_job() -> None:
    """
    Runs daily at 08:00. Finds every active student whose attendance
    is below 75% and creates an in-app notification for them.
    """
    db = SessionLocal()
    try:
        students = (
            db.query(User)
            .filter(User.role == UserRole.student, User.is_active == True)
            .all()
        )
        for student in students:
            total = db.query(func.count(Attendance.id)).filter(
                Attendance.student_id == student.id
            ).scalar() or 0
            if total == 0:
                continue
            present = db.query(func.count(Attendance.id)).filter(
                Attendance.student_id == student.id,
                Attendance.status.in_([AttendanceStatus.present, AttendanceStatus.late]),
            ).scalar() or 0
            pct = round((present / total) * 100, 2)
            if pct < 75:
                create_notification(
                    db,
                    user_id=student.id,
                    title="Low Attendance Alert",
                    message=(
                        f"Your attendance is {pct}%, which is below the required 75%. "
                        "Please attend classes regularly to avoid shortage."
                    ),
                    notification_type="alert",
                )
        db.commit()
        logger.info("Low-attendance check completed.")
    except Exception as exc:
        logger.error("Scheduler job failed: %s", exc)
        db.rollback()
    finally:
        db.close()


def start_scheduler() -> None:
    if _scheduler.running:
        return
    _scheduler.add_job(
        _check_low_attendance_job,
        trigger="cron",
        hour=8,
        minute=0,
        id="low_attendance_check",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Scheduler started — low-attendance check runs daily at 08:00.")


def shutdown_scheduler() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")

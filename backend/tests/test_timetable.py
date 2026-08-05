import pytest
from app.models.subject import Subject
from app.models.user import User, UserRole
from app.models.teacher import TeacherProfile


def test_timetable_crud(client, admin_auth_headers, student_auth_headers):
    # Setup prerequisite Subject and Teacher records in test DB session
    from tests.conftest import TestingSessionLocal
    db = TestingSessionLocal()
    
    teacher = User(email="t_tt@test.com", full_name="Timetable Teacher", hashed_password="x", role=UserRole.teacher)
    db.add(teacher)
    db.flush()
    t_prof = TeacherProfile(user_id=teacher.id, employee_id="EMP-TT", department="CS")
    db.add(t_prof)
    
    subj = Subject(name="Operating Systems", code="CS301", class_name="B.Tech CS", section="A", semester=3, credits=4)
    db.add(subj)
    db.commit()
    
    teacher_id = teacher.id
    subject_id = subj.id
    db.close()

    # Admin creates timetable slot
    slot_data = {
        "class_name": "B.Tech CS",
        "section": "A",
        "subject_id": subject_id,
        "teacher_id": teacher_id,
        "day_of_week": "Monday",
        "start_time": "09:00:00",
        "end_time": "10:00:00",
        "room": "Lab-101"
    }
    resp = client.post("/api/timetable", json=slot_data, headers=admin_auth_headers)
    assert resp.status_code == 201
    entry_id = resp.json()["id"]

    # Student reads timetable
    get_resp = client.get("/api/timetable?class_name=B.Tech+CS&section=A", headers=student_auth_headers)
    assert get_resp.status_code == 200
    assert len(get_resp.json()["timetable"]) >= 1

    # Admin deletes entry
    del_resp = client.delete(f"/api/timetable/{entry_id}", headers=admin_auth_headers)
    assert del_resp.status_code == 200

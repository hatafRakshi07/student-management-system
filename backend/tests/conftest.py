import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.utils.rate_limit import limiter
import app.database as app_db

limiter.enabled = False


TEST_DB_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
app_db.engine = engine
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)



def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_database_session():
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


from sqlalchemy import create_engine, text

@pytest.fixture(autouse=True)
def clean_db_before_test(setup_database_session):
    db = TestingSessionLocal()
    try:
        db.execute(text("PRAGMA foreign_keys = OFF;"))
        for table in Base.metadata.sorted_tables:
            db.execute(table.delete())
        db.commit()
        db.execute(text("PRAGMA foreign_keys = ON;"))
    except Exception:
        db.rollback()
    finally:
        db.close()
    yield



@pytest.fixture
def client():
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()



@pytest.fixture
def admin_token(client):
    """Register/seed and return JWT token for an admin user directly."""
    from app.utils.password_handler import hash_password
    from app.utils.jwt_handler import create_access_token
    from app.models.user import User, UserRole

    db = TestingSessionLocal()
    existing = db.query(User).filter(User.email == "admin@test.com").first()
    if not existing:
        admin = User(
            email="admin@test.com",
            full_name="Test Admin",
            hashed_password=hash_password("Admin@1234"),
            role=UserRole.admin,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        admin_id = admin.id
    else:
        admin_id = existing.id
    db.close()

    return create_access_token({"sub": str(admin_id), "role": "admin"})


@pytest.fixture
def admin_auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def teacher_auth_headers(client):
    from app.utils.password_handler import hash_password
    from app.utils.jwt_handler import create_access_token
    from app.models.user import User, UserRole
    from app.models.teacher import TeacherProfile

    db = TestingSessionLocal()
    teacher = db.query(User).filter(User.email == "teacher@test.com").first()
    if not teacher:
        teacher = User(
            email="teacher@test.com",
            full_name="Test Teacher",
            hashed_password=hash_password("Teacher@1234"),
            role=UserRole.teacher,
        )
        db.add(teacher)
        db.flush()
        profile = TeacherProfile(user_id=teacher.id, employee_id="EMP-TEST", department="CS")
        db.add(profile)
        db.commit()
        db.refresh(teacher)

    token = create_access_token({"sub": str(teacher.id), "role": "teacher"})
    db.close()
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def student_auth_headers(client):
    from app.utils.password_handler import hash_password
    from app.utils.jwt_handler import create_access_token
    from app.models.user import User, UserRole
    from app.models.student import StudentProfile

    db = TestingSessionLocal()
    student = db.query(User).filter(User.email == "student@test.com").first()
    if not student:
        student = User(
            email="student@test.com",
            full_name="Test Student",
            hashed_password=hash_password("Student@1234"),
            role=UserRole.student,
        )
        db.add(student)
        db.flush()
        profile = StudentProfile(user_id=student.id, roll_number="ROLL-TEST", department="CS", class_name="B.Tech", section="A")
        db.add(profile)
        db.commit()
        db.refresh(student)

    token = create_access_token({"sub": str(student.id), "role": "student"})
    db.close()
    return {"Authorization": f"Bearer {token}"}



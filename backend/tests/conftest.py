import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

TEST_DB_URL = "sqlite:///./test_student_management.db"

engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    import os, time
    for _ in range(3):
        try:
            if os.path.exists("test_student_management.db"):
                os.remove("test_student_management.db")
            break
        except PermissionError:
            time.sleep(0.5)


@pytest.fixture
def client(setup_database):
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_token(client):
    """Register and log in an admin user; return the JWT token."""
    # Seed admin directly via DB to bypass the admin-only guard
    from app.utils.password_handler import hash_password
    db = TestingSessionLocal()
    from app.models.user import User, UserRole
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
    db.close()
    res = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "Admin@1234"})
    return res.json()["access_token"]

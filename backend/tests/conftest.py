import pytest
from backend.app import create_app
from backend.extensions import db
from backend.models.user import User

class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = "test-secret-key-32-bytes-minimum-length-examguard"
    JWT_SECRET_KEY = "test-jwt-secret-key-32-bytes-minimum-length-examguard"
    FACE_SIMILARITY_THRESHOLD = 0.65
    PROCTORING_WARNING_LIMIT = 3
    AUTO_SUBMIT_ON_VIOLATIONS = True
    EVENT_COOLDOWN_SECONDS = 1
    GEMINI_API_KEY = ""

@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def student_auth_headers(client):
    # Register and login student
    reg_res = client.post('/api/auth/register', json={
        "name": "Test Student",
        "email": "test.student@test.com",
        "password": "Password123!",
        "role": "student",
        "student_id": "STU-9900",
        "course": "B.Tech CSE",
        "department": "Engineering"
    })
    token = reg_res.get_json()['access_token']
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def teacher_auth_headers(client, app):
    # Register teacher
    client.post('/api/auth/register', json={
        "name": "Test Teacher",
        "email": "test.teacher@test.com",
        "password": "Password123!",
        "role": "teacher",
        "teacher_id": "TCH-9900",
        "designation": "Professor",
        "department": "CS"
    })
    # Manually approve teacher in DB for testing
    with app.app_context():
        t = User.query.filter_by(email="test.teacher@test.com").first()
        t.status = "active"
        if t.teacher_profile:
            t.teacher_profile.approval_status = "approved"
        db.session.commit()

    # Login
    login_res = client.post('/api/auth/login', json={
        "email": "test.teacher@test.com",
        "password": "Password123!"
    })
    token = login_res.get_json()['access_token']
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def admin_auth_headers(client, app):
    with app.app_context():
        admin = User(
            email="admin.test@test.com",
            name="Admin Tester",
            role="admin",
            status="active",
            is_verified=True
        )
        admin.set_password("AdminPass123!")
        db.session.add(admin)
        db.session.commit()

    login_res = client.post('/api/auth/login', json={
        "email": "admin.test@test.com",
        "password": "AdminPass123!"
    })
    token = login_res.get_json()['access_token']
    return {"Authorization": f"Bearer {token}"}

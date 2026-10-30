import json
import base64
import numpy as np
import cv2
from datetime import datetime, timedelta
from backend.services.face_service import FaceVerificationService
from backend.services.proctoring_service import ProctoringEngine
from backend.services.gemini_service import GeminiQuizService

def test_health_check(client):
    res = client.get('/api/health')
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert "service" in data

def test_student_registration_and_login(client):
    # Register
    res = client.post('/api/auth/register', json={
        "name": "Jane Student",
        "email": "jane@university.edu",
        "password": "Secret123Password",
        "role": "student",
        "student_id": "STU-5544",
        "course": "B.Tech IT",
        "department": "Engineering"
    })
    assert res.status_code == 201
    data = res.get_json()
    assert "access_token" in data
    assert data["user"]["email"] == "jane@university.edu"

    # Login
    login_res = client.post('/api/auth/login', json={
        "email": "jane@university.edu",
        "password": "Secret123Password"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.get_json()

def test_teacher_registration_requires_approval(client):
    # Register teacher
    res = client.post('/api/auth/register', json={
        "name": "Dr. Unapproved",
        "email": "unapproved@university.edu",
        "password": "Secret123Password",
        "role": "teacher",
        "teacher_id": "TCH-5555",
        "designation": "Assistant Professor",
        "department": "Physics"
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data["requires_approval"] is True
    assert data["access_token"] is None

    # Try login before approval
    login_res = client.post('/api/auth/login', json={
        "email": "unapproved@university.edu",
        "password": "Secret123Password"
    })
    assert login_res.status_code == 403
    assert "awaiting administrator approval" in login_res.get_json()["error"]

def test_admin_approves_teacher(client, admin_auth_headers):
    # Register teacher
    client.post('/api/auth/register', json={
        "name": "Dr. NewTeacher",
        "email": "new.teacher@university.edu",
        "password": "Secret123Password",
        "role": "teacher",
        "teacher_id": "TCH-7788",
        "designation": "Lecturer",
        "department": "Math"
    })

    # Admin checks users
    users_res = client.get('/api/admin/users?role=teacher&status=pending_approval', headers=admin_auth_headers)
    assert users_res.status_code == 200
    pending_teachers = users_res.get_json()["users"]
    target_teacher = next(u for u in pending_teachers if u["email"] == "new.teacher@university.edu")

    # Approve
    appr_res = client.post(f'/api/admin/teachers/{target_teacher["id"]}/approve', headers=admin_auth_headers)
    assert appr_res.status_code == 200

    # Now teacher can login
    login_res = client.post('/api/auth/login', json={
        "email": "new.teacher@university.edu",
        "password": "Secret123Password"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.get_json()

def test_rbac_protection(client, student_auth_headers):
    # Student attempts to access admin endpoint
    res = client.get('/api/admin/stats', headers=student_auth_headers)
    assert res.status_code == 403

    # Student attempts to create exam
    res2 = client.post('/api/teacher/exams', headers=student_auth_headers, json={"title": "Hacked Exam"})
    assert res2.status_code == 403

def test_exam_lifecycle_autosave_and_backend_evaluation(client, teacher_auth_headers, student_auth_headers):
    # 1. Teacher creates exam with negative marking
    exam_res = client.post('/api/teacher/exams', headers=teacher_auth_headers, json={
        "title": "Data Structures Midterm",
        "description": "Evaluation test exam",
        "duration_minutes": 30,
        "total_marks": 10.0,
        "passing_percentage": 50.0,
        "negative_marking": True,
        "negative_mark_value": 0.5,
        "is_published": True,
        "require_face_verification": False
    })
    assert exam_res.status_code == 201
    exam_id = exam_res.get_json()["exam"]["id"]

    # 2. Teacher adds 2 questions
    q1_res = client.post('/api/teacher/questions', headers=teacher_auth_headers, json={
        "exam_id": exam_id,
        "question_text": "Is Stack a LIFO structure?",
        "question_type": "true_false",
        "marks": 5.0,
        "options": [
            {"option_text": "True", "is_correct": True},
            {"option_text": "False", "is_correct": False}
        ]
    })
    assert q1_res.status_code == 201
    q1_id = q1_res.get_json()["question"]["id"]
    q1_opt_correct = q1_res.get_json()["question"]["options"][0]["id"]

    q2_res = client.post('/api/teacher/questions', headers=teacher_auth_headers, json={
        "exam_id": exam_id,
        "question_text": "Which data structure uses FIFO?",
        "question_type": "mcq",
        "marks": 5.0,
        "options": [
            {"option_text": "Queue", "is_correct": True},
            {"option_text": "Stack", "is_correct": False},
            {"option_text": "Tree", "is_correct": False},
            {"option_text": "Graph", "is_correct": False}
        ]
    })
    q2_id = q2_res.get_json()["question"]["id"]
    # Get incorrect option for Q2 to test negative marking
    q2_opt_wrong = q2_res.get_json()["question"]["options"][1]["id"]

    # 3. Student starts exam
    start_res = client.post('/api/exam/start', headers=student_auth_headers, json={"exam_id": exam_id})
    assert start_res.status_code == 200
    start_data = start_res.get_json()
    attempt_id = start_data["attempt_id"]
    assert len(start_data["questions"]) == 2

    # Verify answers are hidden from student
    for q in start_data["questions"]:
        assert "is_correct" not in q["options"][0]
        assert "explanation" not in q

    # 4. Autosave answer Q1 (correct)
    auto1 = client.post('/api/exam/autosave', headers=student_auth_headers, json={
        "attempt_id": attempt_id,
        "question_id": q1_id,
        "selected_option_id": q1_opt_correct
    })
    assert auto1.status_code == 200

    # 5. Autosave answer Q2 (wrong: -0.5 penalty)
    auto2 = client.post('/api/exam/autosave', headers=student_auth_headers, json={
        "attempt_id": attempt_id,
        "question_id": q2_id,
        "selected_option_id": q2_opt_wrong
    })
    assert auto2.status_code == 200

    # 6. Student submits exam
    submit_res = client.post('/api/exam/submit', headers=student_auth_headers, json={"attempt_id": attempt_id})
    assert submit_res.status_code == 200
    sub_data = submit_res.get_json()
    
    # Q1: +5.0, Q2: -0.5 => Total = 4.5 marks out of 10.0 (45%)
    # Passing percentage is 50%, so is_passed must be False!
    assert sub_data["attempt"]["total_score"] == 4.5
    assert sub_data["attempt"]["percentage"] == 45.0
    assert sub_data["attempt"]["is_passed"] is False

def test_face_verification_similarity_logic():
    service = FaceVerificationService(similarity_threshold=0.65)
    
    # Identical vectors => Cosine similarity should be 1.0
    vec1 = [0.1, 0.2, 0.3, 0.4, 0.5]
    assert service.compute_similarity(vec1, vec1) == 1.0

    # Orthogonal vectors => Cosine similarity should be 0.0
    vec_a = [1.0, 0.0]
    vec_b = [0.0, 1.0]
    assert service.compute_similarity(vec_a, vec_b) == 0.0

def test_proctoring_suspicion_score_calculation():
    engine = ProctoringEngine()
    
    class MockEvent:
        def __init__(self, severity, review_status="pending"):
            self.severity = severity
            self.review_status = review_status

    # 0 events => score 0.0
    assert engine.compute_suspicion_score([]) == 0.0

    # Dismissed events are excluded from score
    dismissed = [MockEvent("critical", review_status="dismissed")]
    assert engine.compute_suspicion_score(dismissed) == 0.0

    # Multiple violations yield positive score capped at 100
    events = [MockEvent("critical"), MockEvent("high"), MockEvent("medium")]
    score = engine.compute_suspicion_score(events)
    assert 40.0 < score <= 100.0

def test_gemini_quiz_service_fallback_or_live():
    svc = GeminiQuizService()
    # Generates structured output regardless of whether external API key is live
    res = svc.generate_quiz(
        subject="Computer Science",
        topic="Binary Search Trees",
        num_questions=3,
        question_type="mcq",
        marks_per_question=2.0
    )
    assert res["success"] is True
    assert len(res["questions"]) == 3
    for q in res["questions"]:
        assert len(q["options"]) == 4
        assert any(opt["is_correct"] for opt in q["options"])

def test_report_pdf_and_csv_generation(client, teacher_auth_headers, student_auth_headers):
    # Create exam
    exam_res = client.post('/api/teacher/exams', headers=teacher_auth_headers, json={
        "title": "Algorithms Final",
        "duration_minutes": 10,
        "is_published": True,
        "require_face_verification": False
    })
    exam_id = exam_res.get_json()["exam"]["id"]

    # Start and submit attempt
    start = client.post('/api/exam/start', headers=student_auth_headers, json={"exam_id": exam_id})
    att_id = start.get_json()["attempt_id"]
    client.post('/api/exam/submit', headers=student_auth_headers, json={"attempt_id": att_id})

    # Download PDF
    pdf_res = client.get(f'/api/reports/attempt/{att_id}/pdf', headers=student_auth_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.content_type == 'application/pdf'
    assert len(pdf_res.data) > 500  # valid non-empty PDF bytes

    # Download CSV
    csv_res = client.get(f'/api/reports/exam/{exam_id}/csv', headers=teacher_auth_headers)
    assert csv_res.status_code == 200
    assert 'text/csv' in csv_res.content_type
    assert b"Attempt ID,Student Name,Student Email" in csv_res.data

def test_browser_violation_and_auto_submission(client, teacher_auth_headers, student_auth_headers):
    # Create exam with warning limit of 2 and auto_submit_on_violations enabled
    exam_res = client.post('/api/teacher/exams', headers=teacher_auth_headers, json={
        "title": "Strict Lockdown Exam",
        "duration_minutes": 20,
        "warning_limit": 2,
        "auto_submit_on_violations": True,
        "is_published": True,
        "require_face_verification": False
    })
    exam_id = exam_res.get_json()["exam"]["id"]

    # Start
    start = client.post('/api/exam/start', headers=student_auth_headers, json={"exam_id": exam_id})
    att_id = start.get_json()["attempt_id"]

    # Violation 1: Tab switch
    v1 = client.post('/api/proctoring/event', headers=student_auth_headers, json={
        "attempt_id": att_id,
        "event_type": "tab_switch",
        "details": {"action": "hidden"}
    })
    assert v1.status_code == 200
    assert v1.get_json()["violation_count"] == 1
    assert v1.get_json()["auto_submitted"] is False

    # Violation 2: Fullscreen exit (reaches warning limit 2)
    v2 = client.post('/api/proctoring/event', headers=student_auth_headers, json={
        "attempt_id": att_id,
        "event_type": "fullscreen_exit",
        "details": {"action": "exit_fullscreen"}
    })
    assert v2.status_code == 200
    assert v2.get_json()["violation_count"] == 2
    assert v2.get_json()["auto_submitted"] is True


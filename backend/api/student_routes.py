from datetime import datetime
from flask import Blueprint, request, jsonify
from sqlalchemy import func
from backend.extensions import db
from backend.models.exam import Exam, ExamAssignment
from backend.models.attempt import ExamAttempt
from backend.models.appeal import Appeal
from backend.models.proctoring_event import ProctoringEvent
from backend.models.notification import Notification
from backend.models.academic import Subject, Course
from backend.services.audit_service import AuditService
from backend.utils.decorators import role_required

student_bp = Blueprint('student_bp', __name__)

@student_bp.route('/dashboard', methods=['GET'])
@role_required('student')
def get_student_dashboard(current_user):
    now = datetime.utcnow()
    
    # 1. Attempts summary
    attempts = ExamAttempt.query.filter_by(student_id=current_user.id).order_by(ExamAttempt.created_at.desc()).all()
    completed_attempts = [a for a in attempts if a.status in ['submitted', 'evaluated', 'under_review']]
    active_attempt = next((a for a in attempts if a.status == 'in_progress'), None)

    avg_score = 0.0
    if completed_attempts:
        avg_score = round(sum(a.percentage for a in completed_attempts) / len(completed_attempts), 1)

    # 2. Upcoming & available exams
    published_exams = Exam.query.filter_by(is_published=True).filter(Exam.status != 'cancelled').all()
    completed_exam_ids = {a.exam_id for a in completed_attempts}
    
    available_exams = []
    upcoming_exams = []
    
    for ex in published_exams:
        if ex.id in completed_exam_ids:
            continue
        if ex.end_time and now > ex.end_time:
            continue
        if ex.start_time and now < ex.start_time:
            upcoming_exams.append(ex.to_dict(include_questions=False, is_student=True))
        else:
            available_exams.append(ex.to_dict(include_questions=False, is_student=True))

    # 3. Performance Trend (last 6 completed exams)
    trend_data = []
    for a in reversed(completed_attempts[:6]):
        trend_data.append({
            "exam": a.exam.title[:15] if a.exam else f"Exam #{a.id}",
            "percentage": a.percentage,
            "score": a.total_score,
            "passed": a.is_passed,
            "date": a.submitted_at.strftime('%b %d') if a.submitted_at else ""
        })

    # 4. Subject-wise performance
    subject_map = {}
    for a in completed_attempts:
        if a.exam and a.exam.subject:
            sub_name = a.exam.subject.name
            if sub_name not in subject_map:
                subject_map[sub_name] = {"total_pct": 0.0, "count": 0}
            subject_map[sub_name]["total_pct"] += a.percentage
            subject_map[sub_name]["count"] += 1

    subject_performance = [
        {"subject": sub, "avg_percentage": round(data["total_pct"] / data["count"], 1), "exams_count": data["count"]}
        for sub, data in subject_map.items()
    ]

    # 5. Recent notifications
    notifications = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.created_at.desc()).limit(5).all()

    return jsonify({
        "stats": {
            "exams_completed": len(completed_attempts),
            "average_score": avg_score,
            "active_exam_available": len(available_exams) > 0,
            "has_face_enrolled": bool(current_user.face_template and current_user.face_template.is_active)
        },
        "active_attempt": active_attempt.to_dict(include_answers=False, is_student=True) if active_attempt else None,
        "available_exams": available_exams,
        "upcoming_exams": upcoming_exams,
        "recent_completed": [a.to_dict(include_answers=False, is_student=True) for a in completed_attempts[:5]],
        "performance_trend": trend_data,
        "subject_performance": subject_performance,
        "notifications": [n.to_dict() for n in notifications]
    }), 200

@student_bp.route('/exams', methods=['GET'])
@role_required('student')
def list_student_exams(current_user):
    now = datetime.utcnow()
    published = Exam.query.filter_by(is_published=True).filter(Exam.status != 'cancelled').all()
    attempts_map = {a.exam_id: a for a in ExamAttempt.query.filter_by(student_id=current_user.id).all()}

    exams_data = []
    for ex in published:
        att = attempts_map.get(ex.id)
        status_category = "available"
        if att and att.status in ['submitted', 'evaluated', 'under_review']:
            status_category = "completed"
        elif att and att.status == 'in_progress':
            status_category = "in_progress"
        elif ex.start_time and now < ex.start_time:
            status_category = "upcoming"
        elif ex.end_time and now > ex.end_time:
            status_category = "expired"

        item = ex.to_dict(include_questions=False, is_student=True)
        item['category'] = status_category
        item['attempt'] = att.to_dict(include_answers=False, is_student=True) if att else None
        exams_data.append(item)

    return jsonify({"exams": exams_data}), 200

@student_bp.route('/exam/verify-code', methods=['POST'])
@role_required('student')
def verify_exam_code(current_user):
    data = request.get_json() or {}
    code = data.get('exam_code', '').strip().upper()

    if not code:
        return jsonify({"error": "Exam code is required."}), 400

    exam = Exam.query.filter_by(exam_code=code, is_published=True).first()
    if not exam:
        return jsonify({"error": "Invalid exam code or exam not published."}), 404

    now = datetime.utcnow()
    if exam.end_time and now > exam.end_time:
        return jsonify({"error": "This examination period has already concluded."}), 400

    return jsonify({
        "valid": True,
        "exam": exam.to_dict(include_questions=False, is_student=True)
    }), 200

@student_bp.route('/results', methods=['GET'])
@role_required('student')
def get_student_results(current_user):
    attempts = ExamAttempt.query.filter_by(student_id=current_user.id).order_by(ExamAttempt.submitted_at.desc()).all()
    completed = [a.to_dict(include_answers=False, is_student=True) for a in attempts if a.status in ['submitted', 'evaluated', 'under_review']]
    return jsonify({"results": completed}), 200

@student_bp.route('/result/<int:attempt_id>', methods=['GET'])
@role_required('student')
def get_student_result_detail(attempt_id, current_user):
    attempt = ExamAttempt.query.filter_by(id=attempt_id, student_id=current_user.id).first()
    if not attempt:
        return jsonify({"error": "Result record not found."}), 404

    exam = attempt.exam
    # Include answers only if teacher configured immediate results or if published
    include_answers = bool(exam and exam.show_result_immediately)
    return jsonify({
        "attempt": attempt.to_dict(include_answers=include_answers, is_student=True),
        "exam": exam.to_dict(include_questions=False, is_student=True) if exam else None,
        "can_appeal": bool(exam and exam.allow_review_requests)
    }), 200

@student_bp.route('/appeals', methods=['POST'])
@role_required('student')
def submit_appeal(current_user):
    data = request.get_json() or {}
    attempt_id = data.get('attempt_id')
    event_id = data.get('event_id')
    statement = data.get('statement', '').strip()

    if not attempt_id or not statement:
        return jsonify({"error": "attempt_id and statement are required."}), 400

    attempt = ExamAttempt.query.filter_by(id=attempt_id, student_id=current_user.id).first()
    if not attempt:
        return jsonify({"error": "Exam attempt not found."}), 404

    appeal = Appeal(
        attempt_id=attempt.id,
        student_id=current_user.id,
        event_id=event_id,
        statement=statement,
        status='submitted'
    )
    db.session.add(appeal)
    attempt.review_status = 'explained'
    db.session.commit()

    AuditService.log(current_user.id, "APPEAL_SUBMITTED", "appeal", appeal.id, {"attempt_id": attempt.id})

    return jsonify({
        "message": "Your review explanation has been submitted to the course examiner.",
        "appeal": appeal.to_dict()
    }), 201

@student_bp.route('/appeals', methods=['GET'])
@role_required('student')
def list_student_appeals(current_user):
    appeals = Appeal.query.filter_by(student_id=current_user.id).order_by(Appeal.created_at.desc()).all()
    return jsonify({"appeals": [ap.to_dict() for ap in appeals]}), 200

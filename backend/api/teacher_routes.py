from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from sqlalchemy import func
from backend.extensions import db
from backend.models.exam import Exam
from backend.models.question import QuestionBank, Question, AnswerOption
from backend.models.attempt import ExamAttempt
from backend.models.student_answer import StudentAnswer
from backend.models.proctoring_event import ProctoringEvent
from backend.models.appeal import Appeal
from backend.models.academic import Subject, Course
from backend.services.gemini_service import GeminiQuizService
from backend.services.audit_service import AuditService
from backend.utils.decorators import role_required
from backend.config import Config

teacher_bp = Blueprint('teacher_bp', __name__)
gemini_service = GeminiQuizService()

@teacher_bp.route('/dashboard', methods=['GET'])
@role_required('teacher')
def get_teacher_dashboard(current_user):
    teacher_exams = Exam.query.filter_by(teacher_id=current_user.id).all()
    exam_ids = [e.id for e in teacher_exams]

    total_created = len(teacher_exams)
    published_count = len([e for e in teacher_exams if e.is_published])

    # Attempts on teacher's exams
    attempts = ExamAttempt.query.filter(ExamAttempt.exam_id.in_(exam_ids)).all() if exam_ids else []
    completed_attempts = [a for a in attempts if a.status in ['submitted', 'evaluated', 'under_review']]

    total_submissions = len(completed_attempts)
    avg_score = round(sum(a.percentage for a in completed_attempts) / total_submissions, 1) if total_submissions > 0 else 0.0
    passed_count = len([a for a in completed_attempts if a.is_passed])
    pass_pct = round((passed_count / total_submissions) * 100, 1) if total_submissions > 0 else 0.0

    # Flagged attempts (suspicion score >= 50 or review_status in ['needs_review', 'escalated'])
    flagged_attempts = [a for a in attempts if a.suspicion_score >= 50 or a.review_status in ['needs_review', 'escalated', 'explained']]

    # Score distribution for charts (0-20, 21-40, 41-60, 61-80, 81-100)
    distribution = [
        {"range": "0-20%", "count": 0},
        {"range": "21-40%", "count": 0},
        {"range": "41-60%", "count": 0},
        {"range": "61-80%", "count": 0},
        {"range": "81-100%", "count": 0}
    ]
    for a in completed_attempts:
        pct = a.percentage
        if pct <= 20:
            distribution[0]["count"] += 1
        elif pct <= 40:
            distribution[1]["count"] += 1
        elif pct <= 60:
            distribution[2]["count"] += 1
        elif pct <= 80:
            distribution[3]["count"] += 1
        else:
            distribution[4]["count"] += 1

    # Recent submissions
    recent_subs = [a.to_dict(include_answers=False) for a in sorted(completed_attempts, key=lambda x: x.submitted_at or x.created_at, reverse=True)[:6]]

    return jsonify({
        "stats": {
            "total_exams": total_created,
            "published_exams": published_count,
            "student_submissions": total_submissions,
            "average_marks": avg_score,
            "pass_percentage": pass_pct,
            "flagged_attempts_count": len(flagged_attempts)
        },
        "score_distribution": distribution,
        "recent_submissions": recent_subs,
        "flagged_attempts": [a.to_dict(include_answers=False) for a in flagged_attempts[:5]],
        "exams": [e.to_dict(include_questions=False) for e in teacher_exams]
    }), 200

@teacher_bp.route('/exams', methods=['GET'])
@role_required('teacher')
def list_exams(current_user):
    exams = Exam.query.filter_by(teacher_id=current_user.id).order_by(Exam.created_at.desc()).all()
    return jsonify({"exams": [e.to_dict(include_questions=True) for e in exams]}), 200

@teacher_bp.route('/exams', methods=['POST'])
@role_required('teacher')
def create_exam(current_user):
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    if not title:
        return jsonify({"error": "Exam title is required."}), 400

    start_time_str = data.get('start_time')
    end_time_str = data.get('end_time')
    try:
        start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00')) if start_time_str else datetime.utcnow()
        end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00')) if end_time_str else datetime.utcnow() + timedelta(days=7)
    except Exception:
        start_time = datetime.utcnow()
        end_time = datetime.utcnow() + timedelta(days=7)

    exam = Exam(
        title=title,
        description=data.get('description', ''),
        exam_code=Exam.generate_exam_code(),
        teacher_id=current_user.id,
        course_id=data.get('course_id'),
        subject_id=data.get('subject_id'),
        duration_minutes=int(data.get('duration_minutes', 60)),
        start_time=start_time,
        end_time=end_time,
        total_marks=float(data.get('total_marks', 100.0)),
        passing_percentage=float(data.get('passing_percentage', 40.0)),
        negative_marking=bool(data.get('negative_marking', False)),
        negative_mark_value=float(data.get('negative_mark_value', 0.25)),
        randomize_questions=bool(data.get('randomize_questions', True)),
        randomize_options=bool(data.get('randomize_options', True)),
        require_face_verification=bool(data.get('require_face_verification', True)),
        warning_limit=int(data.get('warning_limit', 5)),
        auto_submit_on_violations=bool(data.get('auto_submit_on_violations', False)),
        enable_head_pose_detection=bool(data.get('enable_head_pose_detection', True)),
        enable_tab_switch_detection=bool(data.get('enable_tab_switch_detection', True)),
        enable_fullscreen_lock=bool(data.get('enable_fullscreen_lock', True)),
        show_result_immediately=bool(data.get('show_result_immediately', False)),
        allow_review_requests=bool(data.get('allow_review_requests', True)),
        is_published=bool(data.get('is_published', False)),
        status='published' if data.get('is_published') else 'draft'
    )
    db.session.add(exam)
    db.session.flush()

    AuditService.log(current_user.id, "EXAM_CREATED", "exam", exam.id, {"title": exam.title})
    db.session.commit()

    return jsonify({"message": "Exam created successfully.", "exam": exam.to_dict(include_questions=True)}), 201

@teacher_bp.route('/exams/<int:exam_id>', methods=['PUT'])
@role_required('teacher')
def update_exam(exam_id, current_user):
    exam = Exam.query.filter_by(id=exam_id, teacher_id=current_user.id).first()
    if not exam:
        return jsonify({"error": "Exam not found or unauthorized."}), 404

    data = request.get_json() or {}
    for field in ['title', 'description', 'duration_minutes', 'total_marks', 'passing_percentage',
                  'negative_marking', 'negative_mark_value', 'randomize_questions', 'randomize_options',
                  'require_face_verification', 'warning_limit', 'auto_submit_on_violations',
                  'enable_head_pose_detection', 'enable_tab_switch_detection', 'enable_fullscreen_lock',
                  'show_result_immediately', 'allow_review_requests', 'is_published']:
        if field in data:
            setattr(exam, field, data[field])

    if 'is_published' in data:
        exam.status = 'published' if data['is_published'] else 'draft'

    if 'start_time' in data and data['start_time']:
        try:
            exam.start_time = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
        except Exception:
            pass
    if 'end_time' in data and data['end_time']:
        try:
            exam.end_time = datetime.fromisoformat(data['end_time'].replace('Z', '+00:00'))
        except Exception:
            pass

    db.session.commit()
    AuditService.log(current_user.id, "EXAM_UPDATED", "exam", exam.id)
    return jsonify({"message": "Exam updated.", "exam": exam.to_dict(include_questions=True)}), 200

@teacher_bp.route('/exams/<int:exam_id>', methods=['DELETE'])
@role_required('teacher')
def delete_exam(exam_id, current_user):
    exam = Exam.query.filter_by(id=exam_id, teacher_id=current_user.id).first()
    if not exam:
        return jsonify({"error": "Exam not found or unauthorized."}), 404

    db.session.delete(exam)
    db.session.commit()
    AuditService.log(current_user.id, "EXAM_DELETED", "exam", exam_id)
    return jsonify({"message": "Exam deleted successfully."}), 200

@teacher_bp.route('/generate-quiz', methods=['POST'])
@role_required('teacher')
def generate_quiz_ai(current_user):
    data = request.get_json() or {}
    subject = data.get('subject', 'Computer Science').strip()
    topic = data.get('topic', 'Data Structures').strip()
    num_questions = int(data.get('num_questions', 5))
    question_type = data.get('question_type', 'mcq')
    difficulty = data.get('difficulty', 'medium')
    marks_per_question = float(data.get('marks_per_question', 1.0))
    include_explanations = bool(data.get('include_explanations', True))
    reference_material = data.get('reference_material', '').strip()

    if not topic:
        return jsonify({"error": "Topic is required for quiz generation."}), 400

    result = gemini_service.generate_quiz(
        subject=subject,
        topic=topic,
        num_questions=num_questions,
        question_type=question_type,
        difficulty=difficulty,
        marks_per_question=marks_per_question,
        include_explanations=include_explanations,
        reference_material=reference_material
    )

    AuditService.log(
        current_user.id,
        "AI_QUIZ_GENERATED",
        "gemini",
        None,
        {"topic": topic, "count": num_questions, "ai": result.get("ai_generated", False)}
    )

    return jsonify(result), 200

@teacher_bp.route('/questions', methods=['POST'])
@role_required('teacher')
def add_question(current_user):
    data = request.get_json() or {}
    exam_id = data.get('exam_id')
    question_bank_id = data.get('question_bank_id')
    question_text = data.get('question_text', '').strip()
    question_type = data.get('question_type', 'mcq')
    marks = float(data.get('marks', 1.0))
    explanation = data.get('explanation', '')
    difficulty = data.get('difficulty', 'medium')
    topic = data.get('topic', '')
    options = data.get('options', [])

    if not question_text:
        return jsonify({"error": "Question text is required."}), 400

    if exam_id:
        exam = Exam.query.filter_by(id=exam_id, teacher_id=current_user.id).first()
        if not exam:
            return jsonify({"error": "Exam not found or unauthorized."}), 404

    q = Question(
        exam_id=exam_id,
        question_bank_id=question_bank_id,
        question_text=question_text,
        question_type=question_type,
        marks=marks,
        explanation=explanation,
        difficulty=difficulty,
        topic=topic
    )
    db.session.add(q)
    db.session.flush()

    for idx, opt in enumerate(options):
        opt_text = opt.get('option_text', '').strip()
        if opt_text:
            ans_opt = AnswerOption(
                question_id=q.id,
                option_text=opt_text,
                is_correct=bool(opt.get('is_correct', False)),
                order_idx=idx
            )
            db.session.add(ans_opt)

    db.session.commit()
    return jsonify({"message": "Question added successfully.", "question": q.to_dict(include_correct=True)}), 201

@teacher_bp.route('/questions/batch', methods=['POST'])
@role_required('teacher')
def add_questions_batch(current_user):
    """Batch imports approved questions into an exam or question bank."""
    data = request.get_json() or {}
    exam_id = data.get('exam_id')
    question_bank_id = data.get('question_bank_id')
    questions_data = data.get('questions', [])

    if not questions_data:
        return jsonify({"error": "No questions provided in batch payload."}), 400

    if exam_id:
        exam = Exam.query.filter_by(id=exam_id, teacher_id=current_user.id).first()
        if not exam:
            return jsonify({"error": "Exam not found or unauthorized."}), 404

    added = []
    for item in questions_data:
        q = Question(
            exam_id=exam_id,
            question_bank_id=question_bank_id,
            question_text=item.get('question_text'),
            question_type=item.get('question_type', 'mcq'),
            marks=float(item.get('marks', 1.0)),
            explanation=item.get('explanation', ''),
            difficulty=item.get('difficulty', 'medium'),
            topic=item.get('topic', '')
        )
        db.session.add(q)
        db.session.flush()

        for idx, opt in enumerate(item.get('options', [])):
            opt_obj = AnswerOption(
                question_id=q.id,
                option_text=opt.get('option_text'),
                is_correct=bool(opt.get('is_correct', False)),
                order_idx=idx
            )
            db.session.add(opt_obj)
        added.append(q)

    db.session.commit()
    return jsonify({
        "message": f"Successfully imported {len(added)} questions.",
        "imported_count": len(added)
    }), 201

@teacher_bp.route('/questions/<int:q_id>', methods=['DELETE'])
@role_required('teacher')
def delete_question(q_id, current_user):
    q = Question.query.get(q_id)
    if not q:
        return jsonify({"error": "Question not found."}), 404
    if q.exam and q.exam.teacher_id != current_user.id:
        return jsonify({"error": "Unauthorized."}), 403

    db.session.delete(q)
    db.session.commit()
    return jsonify({"message": "Question deleted."}), 200

@teacher_bp.route('/question-banks', methods=['GET'])
@role_required('teacher')
def list_question_banks(current_user):
    banks = QuestionBank.query.filter_by(teacher_id=current_user.id).all()
    return jsonify({"banks": [b.to_dict() for b in banks]}), 200

@teacher_bp.route('/question-banks', methods=['POST'])
@role_required('teacher')
def create_question_bank(current_user):
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    if not title:
        return jsonify({"error": "Title is required."}), 400

    bank = QuestionBank(
        title=title,
        description=data.get('description', ''),
        teacher_id=current_user.id,
        subject_id=data.get('subject_id')
    )
    db.session.add(bank)
    db.session.commit()
    return jsonify({"message": "Question bank created.", "bank": bank.to_dict()}), 201

@teacher_bp.route('/exams/<int:exam_id>/submissions', methods=['GET'])
@role_required('teacher')
def get_exam_submissions(exam_id, current_user):
    exam = Exam.query.filter_by(id=exam_id, teacher_id=current_user.id).first()
    if not exam:
        return jsonify({"error": "Exam not found or unauthorized."}), 404

    attempts = exam.attempts.order_by(ExamAttempt.submitted_at.desc()).all()
    return jsonify({
        "exam": exam.to_dict(include_questions=False),
        "submissions": [a.to_dict(include_answers=True) for a in attempts]
    }), 200

@teacher_bp.route('/attempts/<int:attempt_id>', methods=['GET'])
@role_required('teacher')
def get_attempt_detail(attempt_id, current_user):
    attempt = ExamAttempt.query.get(attempt_id)
    if not attempt or attempt.exam.teacher_id != current_user.id:
        return jsonify({"error": "Attempt not found or unauthorized."}), 404

    events = attempt.proctoring_events.order_by(ProctoringEvent.timestamp.asc()).all()
    appeals = attempt.appeals.all()

    return jsonify({
        "attempt": attempt.to_dict(include_answers=True),
        "exam": attempt.exam.to_dict(include_questions=True),
        "events": [ev.to_dict() for ev in events],
        "appeals": [ap.to_dict() for ap in appeals]
    }), 200

@teacher_bp.route('/attempts/<int:attempt_id>/review', methods=['POST'])
@role_required('teacher')
def review_attempt(attempt_id, current_user):
    attempt = ExamAttempt.query.get(attempt_id)
    if not attempt or attempt.exam.teacher_id != current_user.id:
        return jsonify({"error": "Attempt not found or unauthorized."}), 404

    data = request.get_json() or {}
    status = data.get('review_status')  # none, needs_review, explained, confirmed_violation, escalated, dismissed
    remarks = data.get('teacher_remarks', '').strip()

    if status:
        attempt.review_status = status
    if remarks:
        attempt.teacher_remarks = remarks

    db.session.commit()
    AuditService.log(current_user.id, "ATTEMPT_REVIEWED", "exam_attempt", attempt.id, {"status": status})

    return jsonify({
        "message": "Attempt review status recorded.",
        "attempt": attempt.to_dict(include_answers=False)
    }), 200

@teacher_bp.route('/events/<int:event_id>/review', methods=['POST'])
@role_required('teacher')
def review_event(event_id, current_user):
    event = ProctoringEvent.query.get(event_id)
    if not event or event.attempt.exam.teacher_id != current_user.id:
        return jsonify({"error": "Event not found or unauthorized."}), 404

    data = request.get_json() or {}
    status = data.get('review_status')  # pending, dismissed, confirmed, escalated
    notes = data.get('reviewer_notes', '').strip()

    if status:
        event.review_status = status
    if notes:
        event.reviewer_notes = notes

    # Recalculate suspicion score since dismissed events are excluded
    from backend.services.proctoring_service import ProctoringEngine
    engine = ProctoringEngine()
    event.attempt.suspicion_score = engine.compute_suspicion_score(event.attempt.proctoring_events.all())

    db.session.commit()
    return jsonify({
        "message": "Proctoring event status updated.",
        "event": event.to_dict(),
        "updated_suspicion_score": event.attempt.suspicion_score
    }), 200

import random
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.exam import Exam
from backend.models.question import Question, AnswerOption
from backend.models.attempt import ExamAttempt
from backend.models.student_answer import StudentAnswer
from backend.models.notification import Notification
from backend.services.evaluation_service import ExamEvaluationService
from backend.services.audit_service import AuditService
from backend.utils.decorators import role_required

exam_bp = Blueprint('exam_bp', __name__)

@exam_bp.route('/start', methods=['POST'])
@role_required('student')
def start_exam(current_user):
    data = request.get_json() or {}
    exam_id = data.get('exam_id')
    exam_code = data.get('exam_code')

    if not exam_id and not exam_code:
        return jsonify({"error": "Exam ID or Exam Code is required."}), 400

    query = Exam.query
    if exam_id:
        query = query.filter_by(id=exam_id)
    elif exam_code:
        query = query.filter_by(exam_code=exam_code.strip().upper())
    exam = query.first()

    if not exam:
        return jsonify({"error": "Examination not found."}), 404

    if not exam.is_published or exam.status == 'cancelled':
        return jsonify({"error": "This examination is not currently published or available."}), 403

    now = datetime.utcnow()
    # Check start and end window
    if exam.start_time and now < exam.start_time:
        return jsonify({"error": f"Examination has not started yet. Starts at {exam.start_time.isoformat()}."}), 403

    if exam.end_time and now > exam.end_time:
        return jsonify({"error": "Examination window has concluded."}), 403

    # Check biometric enrollment requirement
    if exam.require_face_verification:
        has_face = bool(current_user.face_template and current_user.face_template.is_active)
        if not has_face:
            return jsonify({
                "error": "This examination requires biometric face verification. Please enroll your face in your profile first.",
                "requires_face_enrollment": True
            }), 403

    # Check if student already has an attempt
    existing_attempt = ExamAttempt.query.filter_by(
        exam_id=exam.id,
        student_id=current_user.id
    ).first()

    if existing_attempt:
        if existing_attempt.status in ['submitted', 'evaluated', 'under_review']:
            return jsonify({
                "error": "You have already completed and submitted this examination.",
                "attempt_id": existing_attempt.id,
                "already_submitted": True
            }), 400
        # Resume existing in-progress attempt
        attempt = existing_attempt
    else:
        # Create fresh attempt
        end_time_calc = now + timedelta(minutes=exam.duration_minutes)
        if exam.end_time and end_time_calc > exam.end_time:
            end_time_calc = exam.end_time

        attempt = ExamAttempt(
            exam_id=exam.id,
            student_id=current_user.id,
            status='in_progress',
            start_time=now,
            scheduled_end_time=end_time_calc,
            ip_address=request.remote_addr
        )
        db.session.add(attempt)
        db.session.flush()

        AuditService.log(current_user.id, "EXAM_STARTED", "exam_attempt", attempt.id, {"exam_id": exam.id})

    # Prepare questions
    questions_list = list(exam.questions.all())
    if exam.randomize_questions:
        # Deterministic shuffle per student so it doesn't change on refresh
        rng = random.Random(attempt.id)
        rng.shuffle(questions_list)

    prepared_questions = []
    for q in questions_list:
        opts = list(q.options)
        if exam.randomize_options and q.question_type == 'mcq':
            rng_opt = random.Random(attempt.id + q.id)
            rng_opt.shuffle(opts)

        prepared_questions.append({
            'id': q.id,
            'question_text': q.question_text,
            'question_type': q.question_type,
            'marks': q.marks,
            'topic': q.topic,
            'options': [{'id': opt.id, 'option_text': opt.option_text} for opt in opts]
        })

    # Saved answers map
    saved_answers = {}
    for ans in attempt.answers.all():
        saved_answers[ans.question_id] = {
            'selected_option_id': ans.selected_option_id,
            'text_response': ans.text_response,
            'is_marked_for_review': ans.is_marked_for_review,
            'is_answered': ans.is_answered
        }

    # Calculate remaining time in seconds
    remaining_seconds = max(0, int((attempt.scheduled_end_time - datetime.utcnow()).total_seconds()))

    db.session.commit()

    return jsonify({
        "attempt_id": attempt.id,
        "exam": exam.to_dict(include_questions=False, is_student=True),
        "scheduled_end_time": attempt.scheduled_end_time.isoformat(),
        "remaining_seconds": remaining_seconds,
        "questions": prepared_questions,
        "saved_answers": saved_answers,
        "violation_count": attempt.violation_count,
        "warning_limit": exam.warning_limit
    }), 200

@exam_bp.route('/autosave', methods=['POST'])
@role_required('student')
def autosave_answer(current_user):
    data = request.get_json() or {}
    attempt_id = data.get('attempt_id')
    question_id = data.get('question_id')
    selected_option_id = data.get('selected_option_id')
    text_response = data.get('text_response')
    is_marked_for_review = data.get('is_marked_for_review', False)

    if not attempt_id or not question_id:
        return jsonify({"error": "attempt_id and question_id are required."}), 400

    attempt = ExamAttempt.query.filter_by(id=attempt_id, student_id=current_user.id).first()
    if not attempt:
        return jsonify({"error": "Attempt not found."}), 404

    if attempt.status != 'in_progress':
        return jsonify({"error": f"Attempt is {attempt.status} and cannot be modified."}), 400

    # Check timer expiration
    if attempt.scheduled_end_time and datetime.utcnow() > attempt.scheduled_end_time:
        # Auto-submit expired attempt
        ExamEvaluationService.evaluate_attempt(attempt)
        attempt.auto_submitted = True
        attempt.submitted_at = datetime.utcnow()
        db.session.commit()
        return jsonify({"error": "Exam time has expired. Your exam has been submitted automatically.", "expired": True}), 400

    answer = StudentAnswer.query.filter_by(attempt_id=attempt.id, question_id=question_id).first()
    if not answer:
        answer = StudentAnswer(
            attempt_id=attempt.id,
            question_id=question_id
        )
        db.session.add(answer)

    answer.selected_option_id = selected_option_id
    answer.text_response = text_response
    answer.is_marked_for_review = is_marked_for_review
    answer.is_answered = bool(selected_option_id is not None or (text_response and text_response.strip()))
    answer.answered_at = datetime.utcnow()

    db.session.commit()

    return jsonify({
        "success": True,
        "saved_at": answer.answered_at.isoformat(),
        "is_answered": answer.is_answered
    }), 200

@exam_bp.route('/submit', methods=['POST'])
@role_required('student')
def submit_exam(current_user):
    data = request.get_json() or {}
    attempt_id = data.get('attempt_id')
    auto_submitted = data.get('auto_submitted', False)

    if not attempt_id:
        return jsonify({"error": "attempt_id is required."}), 400

    attempt = ExamAttempt.query.filter_by(id=attempt_id, student_id=current_user.id).first()
    if not attempt:
        return jsonify({"error": "Attempt not found."}), 404

    if attempt.status in ['submitted', 'evaluated', 'under_review']:
        return jsonify({"message": "Exam has already been submitted.", "attempt": attempt.to_dict()}), 200

    attempt.submitted_at = datetime.utcnow()
    attempt.auto_submitted = auto_submitted
    if attempt.start_time:
        attempt.time_spent_seconds = int((attempt.submitted_at - attempt.start_time).total_seconds())

    # Evaluate marks
    eval_result = ExamEvaluationService.evaluate_attempt(attempt)
    db.session.commit()

    AuditService.log(
        current_user.id,
        "EXAM_SUBMITTED",
        "exam_attempt",
        attempt.id,
        {"score": attempt.total_score, "auto": auto_submitted}
    )

    # In-app notification
    notif = Notification(
        user_id=current_user.id,
        title=f"Exam Submitted: {attempt.exam.title}",
        message=f"Your submission has been recorded. Score: {attempt.total_score} ({attempt.percentage}%).",
        type="exam",
        link=f"/student/results/{attempt.id}"
    )
    db.session.add(notif)
    db.session.commit()

    return jsonify({
        "message": "Examination submitted successfully.",
        "attempt": attempt.to_dict(include_answers=attempt.exam.show_result_immediately, is_student=True),
        "evaluation": eval_result
    }), 200

@exam_bp.route('/state/<int:attempt_id>', methods=['GET'])
@role_required('student')
def get_exam_state(attempt_id, current_user):
    attempt = ExamAttempt.query.filter_by(id=attempt_id, student_id=current_user.id).first()
    if not attempt:
        return jsonify({"error": "Attempt not found."}), 404

    exam = attempt.exam
    remaining_seconds = 0
    if attempt.scheduled_end_time and attempt.status == 'in_progress':
        remaining_seconds = max(0, int((attempt.scheduled_end_time - datetime.utcnow()).total_seconds()))

    saved_answers = {}
    for ans in attempt.answers.all():
        saved_answers[ans.question_id] = {
            'selected_option_id': ans.selected_option_id,
            'text_response': ans.text_response,
            'is_marked_for_review': ans.is_marked_for_review,
            'is_answered': ans.is_answered
        }

    return jsonify({
        "attempt": attempt.to_dict(include_answers=False, is_student=True),
        "remaining_seconds": remaining_seconds,
        "saved_answers": saved_answers,
        "violation_count": attempt.violation_count,
        "warning_limit": exam.warning_limit if exam else 5
    }), 200

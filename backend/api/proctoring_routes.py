from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.attempt import ExamAttempt
from backend.models.proctoring_event import ProctoringEvent
from backend.services.proctoring_service import ProctoringEngine
from backend.services.face_service import FaceVerificationService
from backend.services.evaluation_service import ExamEvaluationService
from backend.services.audit_service import AuditService
from backend.utils.decorators import role_required
from backend.config import Config

proctoring_bp = Blueprint('proctoring_bp', __name__)
engine = ProctoringEngine(cooldown_seconds=Config.EVENT_COOLDOWN_SECONDS)

@proctoring_bp.route('/analyze-frame', methods=['POST'])
@role_required('student')
def analyze_frame(current_user):
    data = request.get_json() or {}
    attempt_id = data.get('attempt_id')
    frame_b64 = data.get('image', '')

    if not attempt_id or not frame_b64:
        return jsonify({"error": "attempt_id and image frame are required."}), 400

    attempt = ExamAttempt.query.filter_by(id=attempt_id, student_id=current_user.id).first()
    if not attempt or attempt.status != 'in_progress':
        return jsonify({"error": "Valid in-progress attempt not found."}), 404

    try:
        frame = FaceVerificationService.decode_base64_image(frame_b64)
    except Exception as e:
        return jsonify({"error": f"Image decode failure: {str(e)}"}), 400

    analysis = engine.evaluate_head_pose_and_presence(frame)
    event_type = analysis.get("event")

    triggered_event = None
    if event_type and event_type != "normal":
        # Check cooldown to prevent duplicate logging within cooldown window
        cooldown_threshold = datetime.utcnow() - timedelta(seconds=engine.cooldown_seconds)
        recent_event = ProctoringEvent.query.filter(
            ProctoringEvent.attempt_id == attempt.id,
            ProctoringEvent.event_type == event_type,
            ProctoringEvent.timestamp >= cooldown_threshold
        ).first()

        if not recent_event:
            severity = analysis.get("severity", "medium")
            confidence = analysis.get("confidence", 0.9)
            details = {
                "message": analysis.get("message"),
                "yaw": analysis.get("yaw"),
                "pitch": analysis.get("pitch"),
                "face_count": analysis.get("face_count", 0)
            }

            p_event = ProctoringEvent(
                attempt_id=attempt.id,
                event_type=event_type,
                severity=severity,
                confidence=confidence,
                timestamp=datetime.utcnow()
            )
            p_event.set_details(details)
            db.session.add(p_event)
            db.session.flush()

            # Increment violation count
            attempt.violation_count = (attempt.violation_count or 0) + 1
            # Recalculate suspicion score
            all_events = attempt.proctoring_events.all()
            attempt.suspicion_score = engine.compute_suspicion_score(all_events)
            triggered_event = p_event.to_dict()

            # Check if warning limit exceeded and auto-submit enabled
            exam = attempt.exam
            if exam and exam.auto_submit_on_violations and attempt.violation_count >= exam.warning_limit:
                attempt.auto_submitted = True
                attempt.submitted_at = datetime.utcnow()
                ExamEvaluationService.evaluate_attempt(attempt)
                db.session.commit()
                return jsonify({
                    "auto_submitted": True,
                    "reason": f"Maximum allowed proctoring warnings ({exam.warning_limit}) reached.",
                    "analysis": analysis,
                    "event": triggered_event
                }), 200

            db.session.commit()

    return jsonify({
        "status": analysis.get("status", "anomaly_detected" if event_type else "normal"),
        "analysis": analysis,
        "event_logged": bool(triggered_event),
        "event": triggered_event,
        "violation_count": attempt.violation_count,
        "suspicion_score": attempt.suspicion_score
    }), 200

@proctoring_bp.route('/event', methods=['POST'])
@role_required('student')
def log_browser_event(current_user):
    data = request.get_json() or {}
    attempt_id = data.get('attempt_id')
    event_type = data.get('event_type')
    details_payload = data.get('details', {})

    if not attempt_id or not event_type:
        return jsonify({"error": "attempt_id and event_type are required."}), 400

    attempt = ExamAttempt.query.filter_by(id=attempt_id, student_id=current_user.id).first()
    if not attempt or attempt.status != 'in_progress':
        return jsonify({"error": "In-progress attempt not found."}), 404

    # Cooldown check
    cooldown_threshold = datetime.utcnow() - timedelta(seconds=engine.cooldown_seconds)
    recent = ProctoringEvent.query.filter(
        ProctoringEvent.attempt_id == attempt.id,
        ProctoringEvent.event_type == event_type,
        ProctoringEvent.timestamp >= cooldown_threshold
    ).first()

    if recent:
        return jsonify({"message": "Event ignored due to cooldown throttling."}), 200

    severity = engine.EVENT_SEVERITY_MAP.get(event_type, "medium")
    p_event = ProctoringEvent(
        attempt_id=attempt.id,
        event_type=event_type,
        severity=severity,
        confidence=1.0,
        timestamp=datetime.utcnow()
    )
    p_event.set_details(details_payload)
    db.session.add(p_event)
    db.session.flush()

    attempt.violation_count = (attempt.violation_count or 0) + 1
    all_events = attempt.proctoring_events.all()
    attempt.suspicion_score = engine.compute_suspicion_score(all_events)

    exam = attempt.exam
    auto_submitted = False
    if exam and exam.auto_submit_on_violations and attempt.violation_count >= exam.warning_limit:
        attempt.auto_submitted = True
        attempt.submitted_at = datetime.utcnow()
        ExamEvaluationService.evaluate_attempt(attempt)
        auto_submitted = True

    db.session.commit()

    return jsonify({
        "success": True,
        "event": p_event.to_dict(),
        "violation_count": attempt.violation_count,
        "suspicion_score": attempt.suspicion_score,
        "auto_submitted": auto_submitted,
        "warning_limit": exam.warning_limit if exam else 5
    }), 200

@proctoring_bp.route('/events/<int:attempt_id>', methods=['GET'])
@role_required()
def get_attempt_events(attempt_id, current_user):
    attempt = ExamAttempt.query.get(attempt_id)
    if not attempt:
        return jsonify({"error": "Attempt not found."}), 404

    # RBAC: Student can only view own events; Teachers can view events for their exams; Admin can view all
    if current_user.role == 'student' and attempt.student_id != current_user.id:
        return jsonify({"error": "Access denied."}), 403
    if current_user.role == 'teacher' and attempt.exam.teacher_id != current_user.id:
        return jsonify({"error": "Access denied."}), 403

    events = ProctoringEvent.query.filter_by(attempt_id=attempt_id).order_by(ProctoringEvent.timestamp.asc()).all()

    return jsonify({
        "attempt_id": attempt_id,
        "suspicion_score": attempt.suspicion_score,
        "violation_count": attempt.violation_count,
        "events": [ev.to_dict() for ev in events]
    }), 200

from datetime import datetime
from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.face_template import FaceTemplate
from backend.models.attempt import ExamAttempt
from backend.services.face_service import FaceVerificationService
from backend.services.audit_service import AuditService
from backend.utils.decorators import role_required
from backend.config import Config

face_bp = Blueprint('face_bp', __name__)
face_service = FaceVerificationService(similarity_threshold=Config.FACE_SIMILARITY_THRESHOLD)

@face_bp.route('/status', methods=['GET'])
@role_required('student')
def get_face_status(current_user):
    template = FaceTemplate.query.filter_by(user_id=current_user.id, is_active=True).first()
    return jsonify({
        "enrolled": bool(template),
        "consent_given": bool(template.consent_given) if template else False,
        "enrolled_at": template.consent_timestamp.isoformat() if (template and template.consent_timestamp) else None,
        "model_version": template.model_version if template else None
    }), 200

@face_bp.route('/register', methods=['POST'])
@role_required('student')
def register_face(current_user):
    data = request.get_json() or {}
    image_base64 = data.get('image', '')
    consent = data.get('consent', False)

    if not consent:
        return jsonify({"error": "Explicit biometric consent is required before face registration."}), 400

    if not image_base64:
        return jsonify({"error": "Webcam image capture data is required."}), 400

    try:
        img = face_service.decode_base64_image(image_base64)
    except Exception as e:
        return jsonify({"error": f"Failed to process webcam image: {str(e)}"}), 400

    # Extract embedding
    extract_res = face_service.extract_face_embedding(img)
    if not extract_res["success"]:
        return jsonify({
            "error": extract_res["error"],
            "quality": extract_res.get("quality")
        }), 422

    # Check existing template or create new
    template = FaceTemplate.query.filter_by(user_id=current_user.id).first()
    if not template:
        template = FaceTemplate(
            user_id=current_user.id,
            consent_given=True,
            consent_timestamp=datetime.utcnow(),
            model_version=extract_res["model_version"],
            is_active=True
        )
        db.session.add(template)

    template.set_embedding(extract_res["embedding"])
    template.is_active = True
    template.updated_at = datetime.utcnow()

    if current_user.student_profile:
        current_user.student_profile.face_registered = True
        current_user.student_profile.face_updated_at = datetime.utcnow()

    db.session.commit()
    AuditService.log(current_user.id, "FACE_TEMPLATE_ENROLLED", "face_template", template.id)

    return jsonify({
        "message": "Biometric face template registered successfully.",
        "quality": extract_res["quality"],
        "model_version": extract_res["model_version"]
    }), 200

@face_bp.route('/verify', methods=['POST'])
@role_required('student')
def verify_face(current_user):
    data = request.get_json() or {}
    image_base64 = data.get('image', '')
    attempt_id = data.get('attempt_id')

    if not image_base64:
        return jsonify({"error": "Webcam frame required for identity verification."}), 400

    template = FaceTemplate.query.filter_by(user_id=current_user.id, is_active=True).first()
    if not template:
        return jsonify({
            "verified": False,
            "error": "No enrolled face template found. Please register your face profile before taking exams."
        }), 400

    try:
        img = face_service.decode_base64_image(image_base64)
    except Exception as e:
        return jsonify({"verified": False, "error": f"Invalid camera snapshot: {str(e)}"}), 400

    stored_embedding = template.get_embedding()
    result = face_service.verify_face(img, stored_embedding)

    # If attempt_id was passed, record biometric verification outcome
    if attempt_id:
        attempt = ExamAttempt.query.filter_by(id=attempt_id, student_id=current_user.id).first()
        if attempt:
            attempt.face_verification_passed = result["verified"]
            attempt.face_similarity_score = result["similarity"]
            attempt.face_verified_at = datetime.utcnow()
            db.session.commit()

    AuditService.log(
        current_user.id,
        "FACE_VERIFICATION_ATTEMPT",
        "attempt",
        attempt_id,
        {"verified": result["verified"], "similarity": result["similarity"]}
    )

    status_code = 200 if result["verified"] else 400
    return jsonify(result), status_code

@face_bp.route('/delete', methods=['DELETE'])
@role_required('student')
def delete_face_template(current_user):
    template = FaceTemplate.query.filter_by(user_id=current_user.id).first()
    if template:
        db.session.delete(template)

    if current_user.student_profile:
        current_user.student_profile.face_registered = False
        current_user.student_profile.face_updated_at = None

    db.session.commit()
    AuditService.log(current_user.id, "FACE_TEMPLATE_DELETED", "user", current_user.id)

    return jsonify({"message": "Biometric face template has been completely purged from system."}), 200

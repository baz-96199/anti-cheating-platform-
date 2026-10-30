from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, get_jwt_identity
from backend.extensions import db
from backend.models.user import User
from backend.models.profile import StudentProfile, TeacherProfile
from backend.models.notification import Notification
from backend.services.audit_service import AuditService
from backend.utils.decorators import role_required

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    name = data.get('name', '').strip()
    role = data.get('role', 'student').lower()

    if not email or not password or not name:
        return jsonify({"error": "Name, email, and password are required."}), 400

    if role not in ['student', 'teacher']:
        return jsonify({"error": "Registration role must be student or teacher."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists."}), 409

    # Password strength check
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long."}), 400

    # Create User
    user = User(
        email=email,
        name=name,
        role=role,
        status='active' if role == 'student' else 'pending_approval'
    )
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    if role == 'student':
        student_id = data.get('student_id', f"STU-{user.id:04d}").strip()
        course = data.get('course', 'Computer Science & Engineering').strip()
        department = data.get('department', 'Engineering').strip()
        semester = data.get('semester', 'Semester 1').strip()

        # Check unique student_id
        if StudentProfile.query.filter_by(student_id=student_id).first():
            db.session.rollback()
            return jsonify({"error": f"Student ID '{student_id}' is already registered."}), 409

        profile = StudentProfile(
            user_id=user.id,
            student_id=student_id,
            course=course,
            department=department,
            semester=semester
        )
        db.session.add(profile)
        welcome_msg = "Welcome to ExamGuard AI! Please enroll your face template in your Profile before taking your first proctored exam."
    else:
        teacher_id = data.get('teacher_id', f"TCH-{user.id:04d}").strip()
        designation = data.get('designation', 'Assistant Professor').strip()
        department = data.get('department', 'Computer Science').strip()
        qualification = data.get('qualification', 'M.Tech / Ph.D.').strip()

        if TeacherProfile.query.filter_by(teacher_id=teacher_id).first():
            db.session.rollback()
            return jsonify({"error": f"Teacher ID '{teacher_id}' is already registered."}), 409

        profile = TeacherProfile(
            user_id=user.id,
            teacher_id=teacher_id,
            designation=designation,
            department=department,
            qualification=qualification,
            approval_status='pending'
        )
        db.session.add(profile)
        welcome_msg = "Your teacher registration has been submitted. An administrator will verify and approve your account shortly."

    # Welcome notification
    notif = Notification(
        user_id=user.id,
        title="Welcome to ExamGuard AI",
        message=welcome_msg,
        type="system"
    )
    db.session.add(notif)
    db.session.commit()

    AuditService.log(user.id, "REGISTER", "user", user.id, {"email": user.email, "role": user.role})

    # Generate token for students immediately; teachers wait for approval
    token = None
    if user.status == 'active':
        token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Registration successful.",
        "user": user.to_dict(),
        "access_token": token,
        "requires_approval": user.status == 'pending_approval'
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password."}), 401

    if user.status == 'suspended':
        return jsonify({"error": "Account suspended. Please contact the administrator."}), 403

    if user.role == 'teacher' and user.status == 'pending_approval':
        return jsonify({
            "error": "Your teacher account is awaiting administrator approval. Please check back later.",
            "status": "pending_approval"
        }), 403

    access_token = create_access_token(identity=str(user.id))
    AuditService.log(user.id, "LOGIN", "user", user.id)

    return jsonify({
        "message": "Login successful.",
        "access_token": access_token,
        "user": user.to_dict()
    }), 200

@auth_bp.route('/me', methods=['GET'])
@role_required()
def get_current_user(current_user):
    return jsonify({
        "user": current_user.to_dict()
    }), 200

@auth_bp.route('/change-password', methods=['POST'])
@role_required()
def change_password(current_user):
    data = request.get_json() or {}
    old_pass = data.get('old_password', '')
    new_pass = data.get('new_password', '')

    if not current_user.check_password(old_pass):
        return jsonify({"error": "Current password is incorrect."}), 400

    if len(new_pass) < 6:
        return jsonify({"error": "New password must be at least 6 characters."}), 400

    current_user.set_password(new_pass)
    db.session.commit()
    AuditService.log(current_user.id, "PASSWORD_CHANGE", "user", current_user.id)

    return jsonify({"message": "Password updated successfully."}), 200

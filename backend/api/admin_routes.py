from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.user import User
from backend.models.profile import TeacherProfile, StudentProfile
from backend.models.exam import Exam
from backend.models.attempt import ExamAttempt
from backend.models.academic import Course, Subject
from backend.models.audit_log import AuditLog
from backend.models.appeal import Appeal
from backend.models.notification import Notification
from backend.services.audit_service import AuditService
from backend.utils.decorators import role_required

admin_bp = Blueprint('admin_bp', __name__)

@admin_bp.route('/stats', methods=['GET'])
@admin_bp.route('/dashboard', methods=['GET'])
@role_required('admin')
def get_admin_stats(current_user):
    total_students = User.query.filter_by(role='student').count()
    total_teachers = User.query.filter_by(role='teacher', status='active').count()
    pending_teachers = User.query.filter_by(role='teacher', status='pending_approval').count()
    
    total_exams = Exam.query.count()
    published_exams = Exam.query.filter_by(is_published=True).count()
    total_attempts = ExamAttempt.query.count()
    
    # Flagged attempts (suspicion score >= 50 or review status escalated)
    flagged_attempts = ExamAttempt.query.filter(
        (ExamAttempt.suspicion_score >= 50) | (ExamAttempt.review_status == 'escalated')
    ).count()

    # User breakdown
    users_by_status = {
        "active": User.query.filter_by(status='active').count(),
        "pending": User.query.filter_by(status='pending_approval').count(),
        "suspended": User.query.filter_by(status='suspended').count()
    }

    # Recent Audit Logs
    recent_logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(10).all()

    return jsonify({
        "stats": {
            "total_students": total_students,
            "total_teachers": total_teachers,
            "pending_teachers": pending_teachers,
            "total_exams": total_exams,
            "published_exams": published_exams,
            "total_attempts": total_attempts,
            "flagged_attempts": flagged_attempts,
            "users_by_status": users_by_status
        },
        "recent_audit_logs": [log.to_dict() for log in recent_logs]
    }), 200

@admin_bp.route('/users', methods=['GET'])
@role_required('admin')
def list_users(current_user):
    role_filter = request.args.get('role')
    status_filter = request.args.get('status')

    query = User.query
    if role_filter:
        query = query.filter_by(role=role_filter)
    if status_filter:
        query = query.filter_by(status=status_filter)

    users = query.order_by(User.created_at.desc()).all()
    return jsonify({"users": [u.to_dict() for u in users]}), 200

@admin_bp.route('/teachers/<int:user_id>/approve', methods=['POST'])
@role_required('admin')
def approve_teacher(user_id, current_user):
    user = User.query.get(user_id)
    if not user or user.role != 'teacher':
        return jsonify({"error": "Teacher account not found."}), 404

    user.status = 'active'
    if user.teacher_profile:
        user.teacher_profile.approval_status = 'approved'
        user.teacher_profile.approved_by = current_user.id
        user.teacher_profile.approved_at = datetime.utcnow()

    # Send in-app notification
    notif = Notification(
        user_id=user.id,
        title="Teacher Account Approved",
        message="Your instructor credentials have been verified and approved by the administrator. You may now create and manage exams.",
        type="system"
    )
    db.session.add(notif)
    db.session.commit()

    AuditService.log(current_user.id, "TEACHER_APPROVED", "user", user.id, {"email": user.email})

    return jsonify({"message": f"Teacher {user.name} approved successfully.", "user": user.to_dict()}), 200

@admin_bp.route('/teachers/<int:user_id>/reject', methods=['POST'])
@role_required('admin')
def reject_teacher(user_id, current_user):
    user = User.query.get(user_id)
    if not user or user.role != 'teacher':
        return jsonify({"error": "Teacher account not found."}), 404

    user.status = 'rejected'
    if user.teacher_profile:
        user.teacher_profile.approval_status = 'rejected'

    db.session.commit()
    AuditService.log(current_user.id, "TEACHER_REJECTED", "user", user.id)

    return jsonify({"message": f"Teacher {user.name} registration rejected.", "user": user.to_dict()}), 200

@admin_bp.route('/users/<int:user_id>/toggle-status', methods=['POST'])
@role_required('admin')
def toggle_user_status(user_id, current_user):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404
    if user.id == current_user.id:
        return jsonify({"error": "Cannot suspend your own administrator account."}), 400

    new_status = 'suspended' if user.status == 'active' else 'active'
    user.status = new_status
    db.session.commit()

    AuditService.log(current_user.id, "USER_STATUS_CHANGE", "user", user.id, {"new_status": new_status})

    return jsonify({"message": f"User status changed to {new_status}.", "user": user.to_dict()}), 200

@admin_bp.route('/courses', methods=['GET'])
@role_required('admin')
def list_courses(current_user):
    courses = Course.query.order_by(Course.name.asc()).all()
    return jsonify({"courses": [c.to_dict() for c in courses]}), 200

@admin_bp.route('/courses', methods=['POST'])
@role_required('admin')
def create_course(current_user):
    data = request.get_json() or {}
    code = data.get('code', '').strip().upper()
    name = data.get('name', '').strip()
    department = data.get('department', '').strip()

    if not code or not name or not department:
        return jsonify({"error": "Course code, name, and department are required."}), 400

    if Course.query.filter_by(code=code).first():
        return jsonify({"error": f"Course code '{code}' already exists."}), 409

    course = Course(code=code, name=name, department=department)
    db.session.add(course)
    db.session.commit()

    AuditService.log(current_user.id, "COURSE_CREATED", "course", course.id, {"name": name})

    return jsonify({"message": "Course created.", "course": course.to_dict()}), 201

@admin_bp.route('/subjects', methods=['POST'])
@role_required('admin')
def create_subject(current_user):
    data = request.get_json() or {}
    code = data.get('code', '').strip().upper()
    name = data.get('name', '').strip()
    course_id = data.get('course_id')

    if not code or not name or not course_id:
        return jsonify({"error": "Subject code, name, and course_id are required."}), 400

    if Subject.query.filter_by(code=code).first():
        return jsonify({"error": f"Subject code '{code}' already exists."}), 409

    subject = Subject(code=code, name=name, course_id=course_id)
    db.session.add(subject)
    db.session.commit()

    return jsonify({"message": "Subject created.", "subject": subject.to_dict()}), 201

@admin_bp.route('/audit-logs', methods=['GET'])
@role_required('admin')
def get_audit_logs(current_user):
    limit = int(request.args.get('limit', 50))
    action_filter = request.args.get('action')

    query = AuditLog.query
    if action_filter:
        query = query.filter_by(action=action_filter)

    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return jsonify({"logs": [l.to_dict() for l in logs]}), 200

@admin_bp.route('/disputes', methods=['GET'])
@role_required('admin')
def get_disputes(current_user):
    # Appeals that are submitted or escalated
    appeals = Appeal.query.order_by(Appeal.created_at.desc()).all()
    return jsonify({"disputes": [a.to_dict() for a in appeals]}), 200

@admin_bp.route('/disputes/<int:appeal_id>/resolve', methods=['POST'])
@role_required('admin')
def resolve_dispute(appeal_id, current_user):
    appeal = Appeal.query.get(appeal_id)
    if not appeal:
        return jsonify({"error": "Dispute appeal not found."}), 404

    data = request.get_json() or {}
    decision = data.get('status', 'accepted')  # accepted, rejected
    notes = data.get('resolution_notes', '').strip()

    appeal.status = decision
    appeal.resolution_notes = notes
    appeal.reviewed_by = current_user.id
    appeal.reviewed_at = datetime.utcnow()

    # Update attempt review status
    if appeal.attempt:
        appeal.attempt.review_status = 'dismissed' if decision == 'accepted' else 'confirmed_violation'
        appeal.attempt.admin_remarks = f"Admin Decision ({decision}): {notes}"

    # Notify student
    notif = Notification(
        user_id=appeal.student_id,
        title=f"Dispute Appeal {decision.capitalize()}",
        message=f"Administrator review completed for exam appeal. Decision: {decision}. Notes: {notes}",
        type="review"
    )
    db.session.add(notif)
    db.session.commit()

    AuditService.log(current_user.id, "DISPUTE_RESOLVED", "appeal", appeal.id, {"decision": decision})

    return jsonify({"message": "Dispute resolved successfully.", "appeal": appeal.to_dict()}), 200

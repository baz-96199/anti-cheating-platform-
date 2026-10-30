from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from backend.extensions import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='student')  # student, teacher, admin
    status = db.Column(db.String(20), nullable=False, default='active')  # active, pending_approval, suspended, rejected
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student_profile = db.relationship('StudentProfile', foreign_keys='StudentProfile.user_id', backref='user', uselist=False, cascade="all, delete-orphan")
    teacher_profile = db.relationship('TeacherProfile', foreign_keys='TeacherProfile.user_id', backref='user', uselist=False, cascade="all, delete-orphan")
    face_template = db.relationship('FaceTemplate', foreign_keys='FaceTemplate.user_id', backref='user', uselist=False, cascade="all, delete-orphan")
    notifications = db.relationship('Notification', foreign_keys='Notification.user_id', backref='user', lazy='dynamic', cascade="all, delete-orphan")
    audit_logs = db.relationship('AuditLog', foreign_keys='AuditLog.user_id', backref='user', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        data = {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'full_name': self.name,
            'role': self.role,
            'status': self.status,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if self.role == 'student' and self.student_profile:
            data['student_profile'] = self.student_profile.to_dict()
            data['has_face_enrolled'] = bool(self.face_template and self.face_template.is_active)
        elif self.role == 'teacher' and self.teacher_profile:
            data['teacher_profile'] = self.teacher_profile.to_dict()
        return data

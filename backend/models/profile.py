from datetime import datetime
from backend.extensions import db

class StudentProfile(db.Model):
    __tablename__ = 'student_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    student_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    course = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    semester = db.Column(db.String(20), nullable=True)
    face_registered = db.Column(db.Boolean, default=False)
    face_updated_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'course': self.course,
            'department': self.department,
            'semester': self.semester,
            'face_registered': self.face_registered,
            'face_updated_at': self.face_updated_at.isoformat() if self.face_updated_at else None
        }

class TeacherProfile(db.Model):
    __tablename__ = 'teacher_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    teacher_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    designation = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    qualification = db.Column(db.String(100), nullable=True)
    approval_status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'teacher_id': self.teacher_id,
            'designation': self.designation,
            'department': self.department,
            'qualification': self.qualification,
            'approval_status': self.approval_status,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None
        }

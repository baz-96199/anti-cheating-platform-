from datetime import datetime
from backend.extensions import db

class ExamAttempt(db.Model):
    __tablename__ = 'exam_attempts'

    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey('exams.id', ondelete='CASCADE'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    status = db.Column(db.String(30), default='verified', nullable=False)  # verified, in_progress, submitted, evaluated, under_review, cancelled
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    scheduled_end_time = db.Column(db.DateTime, nullable=True)
    submitted_at = db.Column(db.DateTime, nullable=True)
    time_spent_seconds = db.Column(db.Integer, default=0)
    
    # Grading results
    total_score = db.Column(db.Float, default=0.0)
    percentage = db.Column(db.Float, default=0.0)
    is_passed = db.Column(db.Boolean, default=False)
    auto_submitted = db.Column(db.Boolean, default=False)
    
    # Pre-exam verification outcome
    face_verification_passed = db.Column(db.Boolean, default=False)
    face_similarity_score = db.Column(db.Float, nullable=True)
    face_verified_at = db.Column(db.DateTime, nullable=True)
    
    # Integrity metrics
    violation_count = db.Column(db.Integer, default=0)
    suspicion_score = db.Column(db.Float, default=0.0)  # 0 to 100 review indicator
    review_status = db.Column(db.String(30), default='none')  # none, needs_review, explained, confirmed_violation, escalated
    teacher_remarks = db.Column(db.Text, nullable=True)
    admin_remarks = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(50), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student = db.relationship('User', foreign_keys=[student_id])
    answers = db.relationship('StudentAnswer', backref='attempt', cascade="all, delete-orphan", lazy='dynamic')
    proctoring_events = db.relationship('ProctoringEvent', backref='attempt', cascade="all, delete-orphan", lazy='dynamic')
    appeals = db.relationship('Appeal', backref='attempt', cascade="all, delete-orphan", lazy='dynamic')

    def to_dict(self, include_answers=False, is_student=False):
        data = {
            'id': self.id,
            'exam_id': self.exam_id,
            'exam_title': self.exam.title if self.exam else None,
            'exam_code': self.exam.exam_code if self.exam else None,
            'student_id': self.student_id,
            'student_name': self.student.name if self.student else None,
            'student_email': self.student.email if self.student else None,
            'status': self.status,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'scheduled_end_time': self.scheduled_end_time.isoformat() if self.scheduled_end_time else None,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'time_spent_seconds': self.time_spent_seconds,
            'total_score': self.total_score,
            'percentage': self.percentage,
            'is_passed': self.is_passed,
            'auto_submitted': self.auto_submitted,
            'face_verification_passed': self.face_verification_passed,
            'face_similarity_score': self.face_similarity_score,
            'face_verified_at': self.face_verified_at.isoformat() if self.face_verified_at else None,
            'violation_count': self.violation_count,
            'suspicion_score': self.suspicion_score,
            'review_status': self.review_status,
            'teacher_remarks': self.teacher_remarks,
            'admin_remarks': self.admin_remarks,
            'total_exam_marks': self.exam.total_marks if self.exam else 0,
            'passing_percentage': self.exam.passing_percentage if self.exam else 40,
            'proctoring_events_count': self.proctoring_events.count(),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_answers:
            data['answers'] = [ans.to_dict(include_correct=not is_student or (self.exam and self.exam.show_result_immediately and self.status in ['evaluated', 'submitted'])) for ans in self.answers]
        return data

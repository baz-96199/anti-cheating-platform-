import secrets
from datetime import datetime
from backend.extensions import db

class Exam(db.Model):
    __tablename__ = 'exams'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    exam_code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id', ondelete='SET NULL'), nullable=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id', ondelete='SET NULL'), nullable=True)
    
    # Timing & Rules
    duration_minutes = db.Column(db.Integer, nullable=False, default=60)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    total_marks = db.Column(db.Float, default=100.0)
    passing_percentage = db.Column(db.Float, default=40.0)
    
    # Exam configuration toggles
    negative_marking = db.Column(db.Boolean, default=False)
    negative_mark_value = db.Column(db.Float, default=0.25)
    randomize_questions = db.Column(db.Boolean, default=True)
    randomize_options = db.Column(db.Boolean, default=True)
    
    # Proctoring Rules
    require_face_verification = db.Column(db.Boolean, default=True)
    warning_limit = db.Column(db.Integer, default=5)
    auto_submit_on_violations = db.Column(db.Boolean, default=False)
    enable_head_pose_detection = db.Column(db.Boolean, default=True)
    enable_tab_switch_detection = db.Column(db.Boolean, default=True)
    enable_fullscreen_lock = db.Column(db.Boolean, default=True)
    
    # Results & Review
    show_result_immediately = db.Column(db.Boolean, default=False)
    allow_review_requests = db.Column(db.Boolean, default=True)
    is_published = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(20), default='draft')  # draft, published, ongoing, completed, cancelled
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    teacher = db.relationship('User', foreign_keys=[teacher_id])
    course = db.relationship('Course', foreign_keys=[course_id])
    subject = db.relationship('Subject', foreign_keys=[subject_id])
    questions = db.relationship('Question', backref='exam', cascade="all, delete-orphan", lazy='dynamic')
    attempts = db.relationship('ExamAttempt', backref='exam', cascade="all, delete-orphan", lazy='dynamic')
    assignments = db.relationship('ExamAssignment', backref='exam', cascade="all, delete-orphan", lazy='dynamic')

    @staticmethod
    def generate_exam_code():
        return secrets.token_hex(4).upper()

    def to_dict(self, include_questions=False, is_student=False):
        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'exam_code': self.exam_code,
            'teacher_id': self.teacher_id,
            'teacher_name': self.teacher.name if self.teacher else 'Unknown',
            'course_id': self.course_id,
            'course_name': self.course.name if self.course else None,
            'subject_id': self.subject_id,
            'subject_name': self.subject.name if self.subject else None,
            'duration_minutes': self.duration_minutes,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'total_marks': self.total_marks,
            'passing_percentage': self.passing_percentage,
            'negative_marking': self.negative_marking,
            'negative_mark_value': self.negative_mark_value,
            'randomize_questions': self.randomize_questions,
            'randomize_options': self.randomize_options,
            'require_face_verification': self.require_face_verification,
            'warning_limit': self.warning_limit,
            'auto_submit_on_violations': self.auto_submit_on_violations,
            'enable_head_pose_detection': self.enable_head_pose_detection,
            'enable_tab_switch_detection': self.enable_tab_switch_detection,
            'enable_fullscreen_lock': self.enable_fullscreen_lock,
            'show_result_immediately': self.show_result_immediately,
            'allow_review_requests': self.allow_review_requests,
            'is_published': self.is_published,
            'status': self.status,
            'question_count': self.questions.count(),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_questions:
            data['questions'] = [q.to_dict(include_correct=not is_student) for q in self.questions]
        return data

class ExamAssignment(db.Model):
    __tablename__ = 'exam_assignments'

    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey('exams.id', ondelete='CASCADE'), nullable=False)
    course_name = db.Column(db.String(100), nullable=True)
    department = db.Column(db.String(100), nullable=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'exam_id': self.exam_id,
            'course_name': self.course_name,
            'department': self.department,
            'student_id': self.student_id
        }

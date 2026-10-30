from datetime import datetime
from backend.extensions import db

class Appeal(db.Model):
    __tablename__ = 'appeals'

    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('exam_attempts.id', ondelete='CASCADE'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey('proctoring_events.id', ondelete='SET NULL'), nullable=True)
    statement = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(30), default='submitted')  # submitted, under_review, accepted, rejected
    resolution_notes = db.Column(db.Text, nullable=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    student = db.relationship('User', foreign_keys=[student_id])
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])
    event = db.relationship('ProctoringEvent', foreign_keys=[event_id])

    def to_dict(self):
        return {
            'id': self.id,
            'attempt_id': self.attempt_id,
            'student_id': self.student_id,
            'student_name': self.student.name if self.student else None,
            'event_id': self.event_id,
            'statement': self.statement,
            'status': self.status,
            'resolution_notes': self.resolution_notes,
            'reviewed_by': self.reviewed_by,
            'reviewer_name': self.reviewer.name if self.reviewer else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

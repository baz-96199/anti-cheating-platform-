import json
from datetime import datetime
from backend.extensions import db

class ProctoringEvent(db.Model):
    __tablename__ = 'proctoring_events'

    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('exam_attempts.id', ondelete='CASCADE'), nullable=False, index=True)
    event_type = db.Column(db.String(50), nullable=False)  # face_missing, multiple_faces, looking_away, head_deviation, camera_obstruction, fullscreen_exit, tab_switch, copy_paste_attempt, restricted_shortcut, permission_revoked
    severity = db.Column(db.String(20), default='medium', nullable=False)  # low, medium, high, critical
    confidence = db.Column(db.Float, default=1.0)
    duration_seconds = db.Column(db.Float, default=0.0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    details = db.Column(db.Text, nullable=True)  # JSON formatted extra details
    review_status = db.Column(db.String(30), default='pending')  # pending, dismissed, confirmed, escalated
    reviewer_notes = db.Column(db.Text, nullable=True)

    def set_details(self, details_dict):
        self.details = json.dumps(details_dict) if details_dict else "{}"

    def get_details(self):
        try:
            return json.loads(self.details) if self.details else {}
        except Exception:
            return {}

    def to_dict(self):
        return {
            'id': self.id,
            'attempt_id': self.attempt_id,
            'event_type': self.event_type,
            'severity': self.severity,
            'confidence': self.confidence,
            'duration_seconds': self.duration_seconds,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'details': self.get_details(),
            'review_status': self.review_status,
            'reviewer_notes': self.reviewer_notes
        }

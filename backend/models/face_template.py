import json
from datetime import datetime
from backend.extensions import db

class FaceTemplate(db.Model):
    __tablename__ = 'face_templates'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    # Store normalized 128-d or 512-d biometric embedding as JSON string
    embedding_data = db.Column(db.Text, nullable=False)
    consent_given = db.Column(db.Boolean, default=True, nullable=False)
    consent_timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    model_version = db.Column(db.String(50), default='facenet_v1_opencv', nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    sample_quality_score = db.Column(db.Float, default=1.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_embedding(self, embedding_list):
        if isinstance(embedding_list, list):
            self.embedding_data = json.dumps(embedding_list)
        else:
            self.embedding_data = json.dumps(list(embedding_list))

    def get_embedding(self):
        try:
            return json.loads(self.embedding_data)
        except Exception:
            return []

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'consent_given': self.consent_given,
            'consent_timestamp': self.consent_timestamp.isoformat() if self.consent_timestamp else None,
            'model_version': self.model_version,
            'is_active': self.is_active,
            'sample_quality_score': self.sample_quality_score,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

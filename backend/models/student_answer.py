from datetime import datetime
from backend.extensions import db

class StudentAnswer(db.Model):
    __tablename__ = 'student_answers'

    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('exam_attempts.id', ondelete='CASCADE'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id', ondelete='CASCADE'), nullable=False)
    selected_option_id = db.Column(db.Integer, db.ForeignKey('answer_options.id', ondelete='SET NULL'), nullable=True)
    text_response = db.Column(db.Text, nullable=True)
    
    is_marked_for_review = db.Column(db.Boolean, default=False)
    is_answered = db.Column(db.Boolean, default=False)
    marks_awarded = db.Column(db.Float, default=0.0)
    is_correct = db.Column(db.Boolean, nullable=True)
    teacher_feedback = db.Column(db.Text, nullable=True)
    answered_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    question = db.relationship('Question', foreign_keys=[question_id])
    selected_option = db.relationship('AnswerOption', foreign_keys=[selected_option_id])

    def to_dict(self, include_correct=False):
        data = {
            'id': self.id,
            'attempt_id': self.attempt_id,
            'question_id': self.question_id,
            'selected_option_id': self.selected_option_id,
            'text_response': self.text_response,
            'is_marked_for_review': self.is_marked_for_review,
            'is_answered': self.is_answered,
            'answered_at': self.answered_at.isoformat() if self.answered_at else None
        }
        if include_correct:
            data['marks_awarded'] = self.marks_awarded
            data['is_correct'] = self.is_correct
            data['teacher_feedback'] = self.teacher_feedback
            if self.question:
                data['question_text'] = self.question.question_text
                data['question_type'] = self.question.question_type
                data['explanation'] = self.question.explanation
                data['marks'] = self.question.marks
        return data

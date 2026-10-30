from datetime import datetime
from backend.extensions import db

class QuestionBank(db.Model):
    __tablename__ = 'question_banks'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    teacher = db.relationship('User', foreign_keys=[teacher_id])
    subject = db.relationship('Subject', foreign_keys=[subject_id])
    questions = db.relationship('Question', backref='question_bank', cascade="all, delete-orphan", lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'teacher_id': self.teacher_id,
            'subject_id': self.subject_id,
            'subject_name': self.subject.name if self.subject else None,
            'questions_count': self.questions.count(),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Question(db.Model):
    __tablename__ = 'questions'

    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey('exams.id', ondelete='CASCADE'), nullable=True)
    question_bank_id = db.Column(db.Integer, db.ForeignKey('question_banks.id', ondelete='CASCADE'), nullable=True)
    
    question_text = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.String(20), default='mcq', nullable=False)  # mcq, true_false, short_answer
    marks = db.Column(db.Float, default=1.0, nullable=False)
    explanation = db.Column(db.Text, nullable=True)
    difficulty = db.Column(db.String(20), default='medium')  # easy, medium, hard
    topic = db.Column(db.String(100), nullable=True)
    order_idx = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    options = db.relationship('AnswerOption', backref='question', cascade="all, delete-orphan", lazy='joined', order_by='AnswerOption.order_idx')

    def to_dict(self, include_correct=False):
        data = {
            'id': self.id,
            'exam_id': self.exam_id,
            'question_bank_id': self.question_bank_id,
            'question_text': self.question_text,
            'question_type': self.question_type,
            'marks': self.marks,
            'difficulty': self.difficulty,
            'topic': self.topic,
            'order_idx': self.order_idx,
            'options': [opt.to_dict(include_correct=include_correct) for opt in self.options],
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_correct:
            data['explanation'] = self.explanation
            # For short_answer, the correct answer can be stored in an option or explanation
            data['correct_options'] = [opt.id for opt in self.options if opt.is_correct]
        return data

class AnswerOption(db.Model):
    __tablename__ = 'answer_options'

    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id', ondelete='CASCADE'), nullable=False)
    option_text = db.Column(db.Text, nullable=False)
    is_correct = db.Column(db.Boolean, default=False, nullable=False)
    order_idx = db.Column(db.Integer, default=0)

    def to_dict(self, include_correct=False):
        data = {
            'id': self.id,
            'question_id': self.question_id,
            'option_text': self.option_text,
            'order_idx': self.order_idx
        }
        if include_correct:
            data['is_correct'] = self.is_correct
        return data

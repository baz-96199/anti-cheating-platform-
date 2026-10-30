from datetime import datetime
from backend.models.question import Question, AnswerOption
from backend.models.student_answer import StudentAnswer

class ExamEvaluationService:
    @staticmethod
    def evaluate_attempt(attempt) -> dict:
        """
        Server-side grading engine. Computes total marks, awarded marks, percentage,
        and pass/fail status strictly from database records.
        """
        exam = attempt.exam
        if not exam:
            raise ValueError("No associated exam found for this attempt.")

        questions = Question.query.filter_by(exam_id=exam.id).all()
        student_answers = {ans.question_id: ans for ans in attempt.answers.all()}

        total_exam_marks = sum(q.marks for q in questions)
        total_awarded = 0.0

        for q in questions:
            ans = student_answers.get(q.id)
            if not ans or not ans.is_answered:
                # Unanswered: 0 marks (not penalized by negative marking)
                if ans:
                    ans.marks_awarded = 0.0
                    ans.is_correct = False
                continue

            if q.question_type in ['mcq', 'true_false']:
                # Find correct option
                correct_opt = AnswerOption.query.filter_by(question_id=q.id, is_correct=True).first()
                if correct_opt and ans.selected_option_id == correct_opt.id:
                    ans.is_correct = True
                    ans.marks_awarded = float(q.marks)
                    total_awarded += float(q.marks)
                else:
                    ans.is_correct = False
                    if exam.negative_marking:
                        penalty = float(exam.negative_mark_value)
                        ans.marks_awarded = -penalty
                        total_awarded -= penalty
                    else:
                        ans.marks_awarded = 0.0
            elif q.question_type == 'short_answer':
                # Automated keyword heuristic or leaves for teacher grading
                if ans.text_response and len(ans.text_response.strip()) > 0:
                    ans.is_correct = None  # Pending teacher review
                    ans.marks_awarded = 0.0
                else:
                    ans.is_correct = False
                    ans.marks_awarded = 0.0

        # Clamp total awarded so it does not drop below 0
        total_awarded = max(0.0, total_awarded)
        percentage = (total_awarded / total_exam_marks * 100.0) if total_exam_marks > 0 else 0.0
        is_passed = percentage >= float(exam.passing_percentage)

        attempt.total_score = round(total_awarded, 2)
        attempt.percentage = round(percentage, 2)
        attempt.is_passed = is_passed
        attempt.status = 'evaluated'

        return {
            "total_marks": total_exam_marks,
            "total_awarded": attempt.total_score,
            "percentage": attempt.percentage,
            "is_passed": attempt.is_passed,
            "passing_percentage": exam.passing_percentage
        }

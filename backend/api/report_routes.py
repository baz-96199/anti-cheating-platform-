from flask import Blueprint, send_file, Response, jsonify
from backend.models.attempt import ExamAttempt
from backend.models.exam import Exam
from backend.services.report_service import ReportService
from backend.utils.decorators import role_required
import io

report_bp = Blueprint('report_bp', __name__)

@report_bp.route('/attempt/<int:attempt_id>/pdf', methods=['GET'])
@role_required()
def download_attempt_pdf(attempt_id, current_user):
    attempt = ExamAttempt.query.get(attempt_id)
    if not attempt:
        return jsonify({"error": "Exam attempt not found."}), 404

    # RBAC check
    if current_user.role == 'student' and attempt.student_id != current_user.id:
        return jsonify({"error": "Unauthorized to access this transcript."}), 403
    if current_user.role == 'teacher' and attempt.exam.teacher_id != current_user.id:
        return jsonify({"error": "Unauthorized."}), 403

    pdf_bytes = ReportService.generate_attempt_pdf(attempt)
    filename = f"ExamGuard_Transcript_Attempt_{attempt.id}_{attempt.student.name.replace(' ', '_')}.pdf"

    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=filename
    )

@report_bp.route('/exam/<int:exam_id>/csv', methods=['GET'])
@role_required('teacher', 'admin')
def download_exam_csv(exam_id, current_user):
    exam = Exam.query.get(exam_id)
    if not exam:
        return jsonify({"error": "Exam not found."}), 404

    if current_user.role == 'teacher' and exam.teacher_id != current_user.id:
        return jsonify({"error": "Unauthorized."}), 403

    csv_data = ReportService.generate_exam_csv(exam)
    filename = f"ExamGuard_Gradebook_{exam.exam_code}_{exam.title.replace(' ', '_')}.csv"

    return Response(
        csv_data,
        mimetype='text/csv',
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

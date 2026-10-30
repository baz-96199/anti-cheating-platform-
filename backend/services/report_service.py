import io
import csv
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

class ReportService:
    @staticmethod
    def generate_attempt_pdf(attempt) -> bytes:
        """Generates a professional academic exam scorecard and proctoring summary in PDF."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ExamTitle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#1E293B'),
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'ExamSubtitle',
            parent=styles['Normal'],
            fontSize=11,
            leading=14,
            textColor=colors.HexColor('#64748B'),
            spaceAfter=15
        )
        heading2_style = ParagraphStyle(
            'SecHeading',
            parent=styles['Heading2'],
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#312E81'),
            spaceBefore=12,
            spaceAfter=8
        )
        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#334155')
        )

        elements = []

        # Header
        elements.append(Paragraph("<b>EXAMGUARD AI</b> — Official Examination Transcript", title_style))
        elements.append(Paragraph(f"Generated on {datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')} | Secure Biometric Verification Record", subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#4F46E5'), spaceAfter=15))

        # Student & Exam Info Table
        exam = attempt.exam
        student = attempt.student
        profile = student.student_profile if student else None

        info_data = [
            [Paragraph("<b>Student Name:</b>", body_style), Paragraph(student.name if student else "N/A", body_style),
             Paragraph("<b>Student ID:</b>", body_style), Paragraph(profile.student_id if profile else "N/A", body_style)],
            [Paragraph("<b>Course / Program:</b>", body_style), Paragraph(profile.course if profile else "N/A", body_style),
             Paragraph("<b>Department:</b>", body_style), Paragraph(profile.department if profile else "N/A", body_style)],
            [Paragraph("<b>Examination:</b>", body_style), Paragraph(exam.title if exam else "N/A", body_style),
             Paragraph("<b>Exam Code:</b>", body_style), Paragraph(exam.exam_code if exam else "N/A", body_style)],
            [Paragraph("<b>Date & Time:</b>", body_style), Paragraph(attempt.start_time.strftime('%Y-%m-%d %H:%M') if attempt.start_time else "N/A", body_style),
             Paragraph("<b>Duration Spent:</b>", body_style), Paragraph(f"{attempt.time_spent_seconds // 60} min {attempt.time_spent_seconds % 60} sec", body_style)]
        ]

        info_table = Table(info_data, colWidths=[110, 160, 110, 150])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 15))

        # Academic Performance & Integrity Outcome
        status_color = colors.HexColor('#16A34A') if attempt.is_passed else colors.HexColor('#DC2626')
        result_text = "PASSED" if attempt.is_passed else "FAILED"
        risk_label = "LOW RISK" if attempt.suspicion_score < 30 else ("MEDIUM RISK" if attempt.suspicion_score < 60 else "ELEVATED RISK")

        outcome_data = [
            [
                Paragraph("<b>Total Score Obtained</b>", body_style),
                Paragraph("<b>Percentage</b>", body_style),
                Paragraph("<b>Result Status</b>", body_style),
                Paragraph("<b>Proctoring Review</b>", body_style)
            ],
            [
                Paragraph(f"<font size=14><b>{attempt.total_score} / {exam.total_marks if exam else 0}</b></font>", body_style),
                Paragraph(f"<font size=14><b>{attempt.percentage}%</b></font>", body_style),
                Paragraph(f"<font size=14 color='{status_color.hexval()}'><b>{result_text}</b></font>", body_style),
                Paragraph(f"<font size=11><b>{risk_label}</b> ({attempt.suspicion_score}/100)</font>", body_style)
            ]
        ]
        outcome_table = Table(outcome_data, colWidths=[130, 130, 130, 140])
        outcome_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EEF2FF')),
            ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#FFFFFF')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#6366F1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(outcome_table)
        elements.append(Spacer(1, 15))

        # Identity Verification & Integrity Summary
        elements.append(Paragraph("Biometric Verification & Proctoring Audit", heading2_style))
        face_status = "VERIFIED MATCH" if attempt.face_verification_passed else "UNVERIFIED"
        similarity_text = f"{round(attempt.face_similarity_score * 100, 1)}%" if attempt.face_similarity_score else "N/A"
        
        audit_data = [
            [Paragraph("<b>Biometric Check:</b>", body_style), Paragraph(f"{face_status} (Similarity: {similarity_text})", body_style)],
            [Paragraph("<b>Proctoring Violations Logged:</b>", body_style), Paragraph(f"{attempt.violation_count} events captured", body_style)],
            [Paragraph("<b>Final Integrity Review:</b>", body_style), Paragraph(attempt.review_status.replace('_', ' ').capitalize(), body_style)],
            [Paragraph("<b>Examiner Remarks:</b>", body_style), Paragraph(attempt.teacher_remarks or "No remarks provided.", body_style)]
        ]
        audit_table = Table(audit_data, colWidths=[180, 350])
        audit_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(audit_table)
        elements.append(Spacer(1, 15))

        # Question Breakdown
        elements.append(Paragraph("Question Evaluation Summary", heading2_style))
        q_rows = [[
            Paragraph("<b>#</b>", body_style),
            Paragraph("<b>Question</b>", body_style),
            Paragraph("<b>Marks</b>", body_style),
            Paragraph("<b>Status</b>", body_style)
        ]]

        for idx, ans in enumerate(attempt.answers.all(), start=1):
            q = ans.question
            q_text = (q.question_text[:70] + "...") if q and len(q.question_text) > 70 else (q.question_text if q else "Question")
            is_corr_str = "Correct" if ans.is_correct else ("Incorrect" if ans.is_correct is False else "Pending Review")
            q_rows.append([
                Paragraph(str(idx), body_style),
                Paragraph(q_text, body_style),
                Paragraph(f"{ans.marks_awarded} / {q.marks if q else 1}", body_style),
                Paragraph(is_corr_str, body_style)
            ])

        if len(q_rows) > 1:
            q_table = Table(q_rows, colWidths=[30, 320, 90, 90])
            q_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(q_table)

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def generate_exam_csv(exam) -> str:
        """Exports exam submission and grading records to CSV."""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            "Attempt ID",
            "Student Name",
            "Student Email",
            "Student ID",
            "Department",
            "Status",
            "Total Score",
            "Exam Max Marks",
            "Percentage",
            "Passed",
            "Violations Count",
            "Suspicion Score",
            "Review Status",
            "Submitted At"
        ])

        for att in exam.attempts.all():
            st = att.student
            prof = st.student_profile if st else None
            writer.writerow([
                att.id,
                st.name if st else "N/A",
                st.email if st else "N/A",
                prof.student_id if prof else "N/A",
                prof.department if prof else "N/A",
                att.status,
                att.total_score,
                exam.total_marks,
                att.percentage,
                "YES" if att.is_passed else "NO",
                att.violation_count,
                att.suspicion_score,
                att.review_status,
                att.submitted_at.isoformat() if att.submitted_at else ""
            ])

        return output.getvalue()

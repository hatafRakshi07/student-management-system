from io import BytesIO
from datetime import datetime


def generate_report_card(student_data: dict, marks_data: list) -> bytes:
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib import colors

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []
        elements.append(Paragraph("STUDENT REPORT CARD", styles["Title"]))
        elements.append(Spacer(1, 12))
        elements.append(Paragraph(f"Name: {student_data.get('full_name', 'N/A')}", styles["Normal"]))
        elements.append(Paragraph(f"Roll No: {student_data.get('roll_number', 'N/A')}", styles["Normal"]))
        elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d')}", styles["Normal"]))
        elements.append(Spacer(1, 20))
        if marks_data:
            table_data = [["Subject", "Exam", "Marks", "Total", "Grade"]]
            for m in marks_data:
                table_data.append([str(m.get("subject", "N/A")), str(m.get("exam_title", "N/A")),
                                    str(m.get("marks_obtained", "N/A")), str(m.get("total_marks", "N/A")),
                                    str(m.get("grade", "N/A"))])
            table = Table(table_data)
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ]))
            elements.append(table)
        doc.build(elements)
        return buffer.getvalue()
    except Exception:
        # Fallback text report card if reportlab is not installed
        report_text = f"STUDENT REPORT CARD\nName: {student_data.get('full_name', 'N/A')}\nRoll No: {student_data.get('roll_number', 'N/A')}\nGenerated: {datetime.now().strftime('%Y-%m-%d')}\n"
        for m in marks_data:
            report_text += f"{m.get('subject')}: {m.get('marks_obtained')}/{m.get('total_marks')} (Grade: {m.get('grade')})\n"
        return report_text.encode('utf-8')

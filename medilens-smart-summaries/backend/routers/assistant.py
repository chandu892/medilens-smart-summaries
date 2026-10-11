"""
Medical Q&A assistant router.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import MedicalReport, User
from schemas import AssistantRequest, AssistantResponse
from security import get_current_user
from services.ai_service import answer_question

router = APIRouter(tags=["assistant"])


@router.post("/assistant", response_model=AssistantResponse)
def ask_assistant(
    body: AssistantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    context = ""
    if body.reportId:
        query = db.query(MedicalReport).filter(MedicalReport.id == body.reportId)
        if current_user.role not in ("doctor", "specialist"):
            query = query.filter(MedicalReport.owner_id == current_user.id)
        report = query.first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found.")
        context = report.raw_text or ""
        if report.summary:
            import json
            context += (
                f"\n\nSUMMARY: {report.summary.overview}"
                f"\nDiagnoses: {json.loads(report.summary.diagnosis)}"
                f"\nMedications: {json.loads(report.summary.medications)}"
            )
    else:
        # Use completed reports for context
        query = db.query(MedicalReport).filter(MedicalReport.status == "completed")
        if current_user.role not in ("doctor", "specialist"):
            query = query.filter(MedicalReport.owner_id == current_user.id)
        reports = query.order_by(MedicalReport.uploaded_at.desc()).limit(5).all()
        import json
        for r in reports:
            context += f"\n\n--- {r.title} ({r.date}) ---\n{r.raw_text[:800]}"
            if r.summary:
                context += f"\nSummary: {r.summary.overview}"

    answer = answer_question(body.question, context)
    return AssistantResponse(answer=answer)

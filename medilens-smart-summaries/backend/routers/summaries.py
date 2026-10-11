"""
Summaries router: get summary, compare reports, health timeline, shares.
Note: /compare is at top-level (not under /reports/) to avoid path collision
with /reports/{report_id}.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import MedicalReport, RecordShare, User
from schemas import (
    CompareResponse,
    LabDiff,
    Medication,
    LabResult,
    ReportSummary,
    TimelineEvent,
)
from security import get_current_user
from routers.reports import _build_report_response

router = APIRouter(tags=["summaries"])


# ---------------------------------------------------------------------------
# Summary for a single report
# ---------------------------------------------------------------------------
@router.get("/reports/{report_id}/summary", response_model=ReportSummary)
def get_summary(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(MedicalReport).filter(MedicalReport.id == report_id)
    if current_user.role not in ("doctor", "specialist"):
        query = query.filter(MedicalReport.owner_id == current_user.id)
    report = query.first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    if not report.summary:
        raise HTTPException(status_code=404, detail="Summary not yet available.")
    s = report.summary
    return ReportSummary(
        overview=s.overview,
        diagnosis=json.loads(s.diagnosis),
        treatment=json.loads(s.treatment),
        medications=[Medication(**m) for m in json.loads(s.medications)],
        labs=[LabResult(**l) for l in json.loads(s.labs)],
    )


# ---------------------------------------------------------------------------
# Compare two reports  ← at /compare (not /reports/compare)
# ---------------------------------------------------------------------------
@router.get("/compare", response_model=CompareResponse)
def compare_reports(
    report_a: str,
    report_b: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    qa = db.query(MedicalReport).filter(MedicalReport.id == report_a)
    qb = db.query(MedicalReport).filter(MedicalReport.id == report_b)
    if current_user.role not in ("doctor", "specialist"):
        qa = qa.filter(MedicalReport.owner_id == current_user.id)
        qb = qb.filter(MedicalReport.owner_id == current_user.id)
    ra = qa.first()
    rb = qb.first()
    if not ra or not rb:
        raise HTTPException(status_code=404, detail="One or both reports not found.")

    labs_a: list[dict] = json.loads(ra.summary.labs) if ra.summary else []
    labs_b: list[dict] = json.loads(rb.summary.labs) if rb.summary else []

    map_a = {l["test"].lower(): l for l in labs_a}
    map_b = {l["test"].lower(): l for l in labs_b}
    all_tests = set(map_a.keys()) | set(map_b.keys())

    diffs: list[LabDiff] = []
    for test in sorted(all_tests):
        la = map_a.get(test)
        lb = map_b.get(test)
        if not la or not lb:
            continue
        try:
            va, vb = float(la["value"]), float(lb["value"])
        except ValueError:
            continue

        flag_a = la.get("flag", "normal")
        flag_b = lb.get("flag", "normal")

        if vb < va:
            change = "improved" if flag_a == "high" else "worsened"
        elif vb > va:
            change = "worsened" if flag_a == "normal" else "improved"
        else:
            change = "stable"

        diffs.append(LabDiff(
            test=la["test"],
            before=la["value"],
            after=lb["value"],
            unit=la.get("unit", ""),
            change=change,
            flagBefore=flag_a,
            flagAfter=flag_b,
        ))

    improved = [d.test for d in diffs if d.change == "improved"]
    worsened = [d.test for d in diffs if d.change == "worsened"]
    parts: list[str] = []
    if improved:
        parts.append(f"Improved: {', '.join(improved)}.")
    if worsened:
        parts.append(f"Needs attention: {', '.join(worsened)}.")
    if not parts:
        parts = ["No comparable lab values found between the two reports."]

    return CompareResponse(
        report_a=report_a,
        report_b=report_b,
        diffs=diffs,
        narrative=" ".join(parts),
    )


# ---------------------------------------------------------------------------
# Health timeline
# ---------------------------------------------------------------------------
@router.get("/timeline", response_model=list[TimelineEvent])
def get_timeline(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(MedicalReport)
    if current_user.role not in ("doctor", "specialist"):
        query = query.filter(MedicalReport.owner_id == current_user.id)
    reports = query.order_by(MedicalReport.date.asc()).all()
    return [
        TimelineEvent(
            date=r.date,
            title=r.title,
            type=r.report_type,
            facility=r.facility or "Unknown facility",
            doctor=r.doctor or "Unknown doctor",
            reportId=r.id,
            status=r.status,
        )
        for r in reports
    ]


# ---------------------------------------------------------------------------
# Shared records
# ---------------------------------------------------------------------------
@router.get("/shares")
def list_shares(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shares = (
        db.query(RecordShare)
        .filter(RecordShare.shared_by_id == current_user.id)
        .order_by(RecordShare.created_at.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "report_id": s.report_id,
            "shared_with_email": s.shared_with_email,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
            "created_at": s.created_at.isoformat(),
        }
        for s in shares
    ]

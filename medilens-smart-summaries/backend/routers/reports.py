"""
Reports router: upload, list, get, delete, verify, download, pipeline status,
                health snapshot, notifications, dashboard stats.
"""
from __future__ import annotations

import json
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from models import (
    AuditLog,
    MedicalCode as MedicalCodeModel,
    MedicalInformation,
    MedicalReport,
    Summary,
    User,
)
from schemas import (
    AppNotification,
    ClinicalAlert,
    DashboardStats,
    DoctorOverviewResponse,
    DoctorPatientSummary,
    ExtractedField,
    HealthSnapshot,
    LabResult,
    Medication,
    MedicalCode,
    PatientInfo,
    PipelineStatusResponse,
    ReportResponse,
    ReportSummary,
)
from security import get_current_user

router = APIRouter(tags=["reports"])

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ACCEPTED_MIMES = {"application/pdf", "image/jpeg", "image/png"}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_report_response(report: MedicalReport) -> ReportResponse:
    info = report.medical_information
    summ = report.summary
    codes = report.codes or []

    patient = PatientInfo(
        name=info.patient_name if info else "",
        age=info.patient_age or 0 if info else 0,
        gender=info.patient_gender if info else "",
        patientId=info.patient_mrn if info else "",
    )

    summary_obj: ReportSummary | None = None
    if summ:
        meds = [Medication(**m) for m in json.loads(summ.medications)]
        labs = [LabResult(**l) for l in json.loads(summ.labs)]
        summary_obj = ReportSummary(
            overview=summ.overview,
            diagnosis=json.loads(summ.diagnosis),
            treatment=json.loads(summ.treatment),
            medications=meds,
            labs=labs,
        )

    extracted = [
        ExtractedField(**f) for f in json.loads(info.extracted_fields if info else "[]")
    ]
    code_objs = [
        MedicalCode(
            system=c.system,
            code=c.code,
            description=c.description,
            confidence=c.confidence,
        )
        for c in codes
    ]

    return ReportResponse(
        id=report.id,
        title=report.title,
        type=report.report_type,
        date=report.date,
        uploadedAt=report.uploaded_at.isoformat(),
        status=report.status,
        facility=report.facility,
        doctor=report.doctor,
        fileName=report.file_name,
        fileSize=report.file_size,
        mime=report.mime,
        confidence=report.confidence,
        verified=report.verified,
        patient=patient,
        summary=summary_obj,
        extracted=extracted,
        codes=code_objs,
        rawText=report.raw_text,
    )


def _audit(db: Session, user_id: str, action: str, resource: str, detail: str, ip: str = "") -> None:
    db.add(AuditLog(user_id=user_id, action=action, resource=resource, detail=detail, ip_address=ip))
    db.commit()


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

@router.post("/reports/upload", response_model=ReportResponse, status_code=201)
async def upload_report(
    file: UploadFile = File(...),
    report_type: str = Form("lab"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate
    if file.content_type not in ACCEPTED_MIMES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: PDF, JPEG, PNG.",
        )
    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_FILE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 10 MB limit.")

    # Save original file (never overwrite)
    ext = Path(file.filename or "upload").suffix or ".bin"
    stored_name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / stored_name
    with open(dest, "wb") as f_out:
        f_out.write(raw_bytes)

    # Create DB record with "uploading" status
    now = datetime.now(timezone.utc)
    report = MedicalReport(
        owner_id=current_user.id,
        title=f"{_type_label(report_type)} — {Path(file.filename or 'upload').stem}",
        report_type=report_type,
        date=now.strftime("%Y-%m-%d"),
        uploaded_at=now,
        status="extracting",
        facility="",
        doctor="",
        file_name=file.filename or stored_name,
        file_size=len(raw_bytes),
        mime=file.content_type,
        file_path=str(dest),
        confidence=0.0,
        raw_text="",
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Run the pipeline synchronously (for localhost simplicity).
    # Production would use a background task queue (Celery / FastAPI BackgroundTasks).
    try:
        _run_pipeline(report, db)
    except Exception as exc:
        report.status = "failed"
        report.raw_text = f"Pipeline error: {exc}"
        db.commit()

    db.refresh(report)
    ip = request.client.host if request and request.client else ""
    _audit(db, current_user.id, "upload", "report", report.id, ip)
    return _build_report_response(report)


def _type_label(report_type: str) -> str:
    labels = {
        "lab": "Lab Report",
        "prescription": "Prescription",
        "radiology": "Radiology Report",
        "discharge_summary": "Discharge Summary",
        "consultation_note": "Consultation Note",
        "follow_up": "Follow-up",
    }
    return labels.get(report_type, "Medical Document")


def _run_pipeline(report: MedicalReport, db: Session) -> None:
    """
    Full pipeline: OCR/text-extraction → medical info extraction → AI summary → codes.
    Updates the report in-place and commits at each stage.
    """
    from services.pdf_service import extract_text_from_pdf
    from services.ocr_service import ocr_image, ocr_scanned_pdf
    from services.extraction_service import extract_medical_info
    from services.ai_service import summarize, DISCLAIMER
    from services.coding_service import generate_codes

    # --- Stage 1: Text extraction ---
    report.status = "extracting"
    db.commit()

    file_path = report.file_path
    mime = report.mime
    raw_text = ""

    if mime == "application/pdf":
        raw_text = extract_text_from_pdf(file_path)
        if not raw_text.strip():
            # Likely scanned PDF — try OCR
            raw_text = ocr_scanned_pdf(file_path)
    else:
        raw_text = ocr_image(file_path)

    report.raw_text = raw_text or "[No text could be extracted from this document.]"
    db.commit()

    # --- Stage 2: Medical info extraction ---
    report.status = "analyzing"
    db.commit()

    ext_result = extract_medical_info(raw_text, report.report_type)

    # Update report with discovered metadata
    if ext_result.facility:
        report.facility = ext_result.facility
    if ext_result.doctor:
        report.doctor = ext_result.doctor
    if ext_result.date:
        report.date = ext_result.date

    info = MedicalInformation(
        report_id=report.id,
        patient_name=ext_result.patient_name,
        patient_age=ext_result.patient_age or None,
        patient_gender=ext_result.patient_gender,
        patient_mrn=ext_result.patient_mrn,
        symptoms=json.dumps(ext_result.symptoms),
        diagnosis=json.dumps(ext_result.diagnosis),
        medications=json.dumps(ext_result.medications),
        allergies=json.dumps(ext_result.allergies),
        lab_results=json.dumps(ext_result.lab_results),
        treatment=json.dumps(ext_result.treatment),
        follow_up=ext_result.follow_up,
        extracted_fields=json.dumps(ext_result.extracted_fields),
    )
    db.add(info)
    db.commit()

    # --- Stage 3: AI summary ---
    extracted_dict = {
        "patient_name": ext_result.patient_name,
        "diagnosis": ext_result.diagnosis,
        "medications": ext_result.medications,
        "lab_results": ext_result.lab_results,
        "treatment": ext_result.treatment,
        "follow_up": ext_result.follow_up,
    }
    summary_data = summarize(raw_text, report.report_type, extracted_dict)

    summary = Summary(
        report_id=report.id,
        overview=summary_data.get("overview", ""),
        diagnosis=json.dumps(summary_data.get("diagnosis", [])),
        treatment=json.dumps(summary_data.get("treatment", [])),
        medications=json.dumps(summary_data.get("medications", [])),
        labs=json.dumps(summary_data.get("labs", [])),
        disclaimer=DISCLAIMER,
    )
    db.add(summary)
    db.commit()

    # --- Stage 4: Medical codes ---
    lab_tests = [l["test"] for l in ext_result.lab_results]
    codes = generate_codes(raw_text, ext_result.diagnosis, lab_tests)
    for c in codes:
        db.add(MedicalCodeModel(
            report_id=report.id,
            system=c["system"],
            code=c["code"],
            description=c["description"],
            confidence=c["confidence"],
        ))

    # Calculate confidence score (avg of codes + quality heuristics)
    all_confs = [c["confidence"] for c in codes]
    text_quality = min(1.0, len(raw_text) / 500)  # longer text = better
    base_conf = (sum(all_confs) / len(all_confs) if all_confs else 0.5) * 100
    report.confidence = round(base_conf * text_quality, 1)
    report.status = "completed"
    db.commit()


# ---------------------------------------------------------------------------
# List / Get / Delete / Verify
# ---------------------------------------------------------------------------

@router.get("/reports", response_model=list[ReportResponse])
def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(MedicalReport)
    # Clinicians see all patient reports to review; patients only see their own
    if current_user.role not in ("doctor", "specialist"):
        query = query.filter(MedicalReport.owner_id == current_user.id)
    reports = query.order_by(MedicalReport.uploaded_at.desc()).all()
    return [_build_report_response(r) for r in reports]


@router.get("/reports/{report_id}", response_model=ReportResponse)
def get_report(
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
    return _build_report_response(report)


@router.delete("/reports/{report_id}", status_code=204)
def delete_report(
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
    # Delete file from disk
    try:
        Path(report.file_path).unlink(missing_ok=True)
    except Exception:
        pass
    db.delete(report)
    db.commit()
    return None


@router.post("/reports/{report_id}/verify", status_code=204)
def verify_report(
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
    report.verified = True
    doctor_label = current_user.full_name or ("Dr. " + current_user.email.split("@")[0].capitalize())
    _audit(
        db,
        current_user.id,
        "verify",
        "report",
        f"Report '{report.title}' verified by {doctor_label}",
    )
    db.commit()
    return None


@router.get("/reports/{report_id}/download")
def download_report(
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
    if not Path(report.file_path).exists():
        raise HTTPException(status_code=404, detail="Original file not found on server.")
    return FileResponse(
        path=report.file_path,
        filename=report.file_name,
        media_type=report.mime,
    )


@router.get("/reports/{report_id}/status", response_model=PipelineStatusResponse)
def report_pipeline_status(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = db.query(MedicalReport).filter(
        MedicalReport.id == report_id,
        MedicalReport.owner_id == current_user.id,
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    progress_map = {
        "uploaded": 10, "extracting": 40, "analyzing": 70, "completed": 100, "failed": 0
    }
    return PipelineStatusResponse(
        reportId=report_id,
        status=report.status,
        progress=progress_map.get(report.status, 0),
    )


# ---------------------------------------------------------------------------
# Dashboard / snapshot / notifications
# ---------------------------------------------------------------------------

@router.get("/patients/me/snapshot", response_model=HealthSnapshot)
def get_health_snapshot(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reports = (
        db.query(MedicalReport)
        .filter(MedicalReport.owner_id == current_user.id, MedicalReport.status == "completed")
        .all()
    )
    conditions: set[str] = set()
    medications: set[str] = set()
    allergies: set[str] = set()

    for r in reports:
        if r.medical_information:
            info = r.medical_information
            conditions.update(json.loads(info.diagnosis))
            allergies.update(json.loads(info.allergies))
            for m in json.loads(info.medications):
                med_str = m.get("name", "")
                if m.get("dose"):
                    med_str += f" {m['dose']}"
                if med_str:
                    medications.add(med_str)

    return HealthSnapshot(
        conditions=sorted(conditions),
        medications=sorted(medications),
        allergies=sorted(allergies),
    )


@router.get("/notifications", response_model=list[AppNotification])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notes: list[AppNotification] = []

    if current_user.role in ("doctor", "specialist"):
        reports = (
            db.query(MedicalReport)
            .order_by(MedicalReport.uploaded_at.desc())
            .limit(15)
            .all()
        )
        for r in reports:
            pname = (
                r.medical_information.patient_name
                if r.medical_information and r.medical_information.patient_name
                else "Patient"
            )
            if r.status == "completed" and not r.verified:
                notes.append(
                    AppNotification(
                        id=f"doc-pending-{r.id}",
                        title="Report Pending Review",
                        body=f"{pname} — '{r.title}' is awaiting clinical sign-off.",
                        time=_time_ago(r.uploaded_at),
                        read=False,
                    )
                )
            elif r.medical_information:
                try:
                    labs = json.loads(r.medical_information.lab_results or "[]")
                    for l in labs:
                        if l.get("flag") in ("high", "low"):
                            notes.append(
                                AppNotification(
                                    id=f"doc-lab-{r.id}-{l.get('test')}",
                                    title=f"Abnormal Lab: {l.get('test')}",
                                    body=f"{pname} recorded {l.get('test')} of {l.get('value')} {l.get('unit')} ({l.get('flag', '').upper()}).",
                                    time=_time_ago(r.uploaded_at),
                                    read=r.verified,
                                )
                            )
                            break
                except Exception:
                    pass
    else:
        reports = (
            db.query(MedicalReport)
            .filter(MedicalReport.owner_id == current_user.id)
            .order_by(MedicalReport.uploaded_at.desc())
            .limit(10)
            .all()
        )
        for r in reports:
            if r.status == "completed" and r.summary:
                doc_name = f" by {r.doctor}" if r.doctor else ""
                body = (
                    f"Your {r.title} was verified{doc_name}."
                    if r.verified
                    else f"Your {r.title} has been summarized."
                )
                notes.append(
                    AppNotification(
                        id=f"notif-{r.id}",
                        title="Report Verified" if r.verified else "Summary Ready",
                        body=body,
                        time=_time_ago(r.uploaded_at),
                        read=r.verified,
                    )
                )
            elif r.status == "failed":
                notes.append(
                    AppNotification(
                        id=f"notif-fail-{r.id}",
                        title="Processing Failed",
                        body=f"{r.title} could not be processed.",
                        time=_time_ago(r.uploaded_at),
                        read=False,
                    )
                )
    return notes


@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    processing_statuses = {"uploaded", "extracting", "analyzing"}

    if current_user.role in ("doctor", "specialist"):
        reports = (
            db.query(MedicalReport)
            .order_by(MedicalReport.uploaded_at.desc())
            .all()
        )
        patient_keys: set[str] = set()
        abnormal_count = 0
        for r in reports:
            if r.medical_information:
                info = r.medical_information
                key = info.patient_mrn or info.patient_name or r.owner_id
                if key:
                    patient_keys.add(key)
                try:
                    labs = json.loads(info.lab_results or "[]")
                    if any(l.get("flag") in ("high", "low") for l in labs):
                        abnormal_count += 1
                except Exception:
                    pass
            elif r.owner_id:
                patient_keys.add(r.owner_id)

        pending_reviews = sum(
            1 for r in reports if not r.verified and r.status == "completed"
        )
        verified_count = sum(1 for r in reports if r.verified)

        return DashboardStats(
            totalReports=len(reports),
            summaries=sum(1 for r in reports if r.summary),
            processing=sum(1 for r in reports if r.status in processing_statuses),
            lastUpload=reports[0].uploaded_at.isoformat() if reports else None,
            totalPatients=len(patient_keys) if patient_keys else len(reports),
            pendingReview=pending_reviews,
            flaggedAbnormal=abnormal_count,
            verifiedReports=verified_count,
        )
    else:
        reports = (
            db.query(MedicalReport)
            .filter(MedicalReport.owner_id == current_user.id)
            .order_by(MedicalReport.uploaded_at.desc())
            .all()
        )
        return DashboardStats(
            totalReports=len(reports),
            summaries=sum(1 for r in reports if r.summary),
            processing=sum(1 for r in reports if r.status in processing_statuses),
            lastUpload=reports[0].uploaded_at.isoformat() if reports else None,
        )


@router.get("/doctor/overview", response_model=DoctorOverviewResponse)
def get_doctor_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("doctor", "specialist"):
        raise HTTPException(status_code=403, detail="Doctor access required.")

    reports = db.query(MedicalReport).order_by(MedicalReport.uploaded_at.desc()).all()
    stats = get_dashboard_stats(db=db, current_user=current_user)

    patient_map: dict[str, dict[str, Any]] = {}
    critical_alerts: list[ClinicalAlert] = []
    pending_reports: list[ReportResponse] = []

    for r in reports:
        if not r.verified and r.status == "completed":
            pending_reports.append(_build_report_response(r))

        info = r.medical_information
        mrn = (
            (info.patient_mrn if info and info.patient_mrn else "")
            or f"PAT-{r.owner_id[:6].upper()}"
        )
        pname = (
            (info.patient_name if info and info.patient_name else "")
            or "Patient"
        )

        # Check labs for critical alerts
        if info and info.lab_results:
            try:
                labs = json.loads(info.lab_results)
                for l in labs:
                    if l.get("flag") in ("high", "low"):
                        critical_alerts.append(
                            ClinicalAlert(
                                id=f"alert-{r.id}-{l.get('test', '')}",
                                patientName=pname,
                                patientMrn=mrn,
                                test=l.get("test", ""),
                                value=str(l.get("value", "")),
                                unit=str(l.get("unit", "")),
                                range=str(l.get("range", "")),
                                flag=l.get("flag", "high"),
                                reportId=r.id,
                                reportTitle=r.title,
                                date=r.date or r.uploaded_at.strftime("%Y-%m-%d"),
                            )
                        )
            except Exception:
                pass

        if mrn not in patient_map:
            diagnosis_list: list[str] = []
            if info and info.diagnosis:
                try:
                    diagnosis_list = json.loads(info.diagnosis)
                except Exception:
                    pass
            patient_map[mrn] = {
                "mrn": mrn,
                "name": pname,
                "age": info.patient_age or 0 if info else 0,
                "gender": info.patient_gender if info else "",
                "diagnosis": diagnosis_list,
                "reportCount": 0,
                "unverifiedCount": 0,
                "hasAbnormalLabs": False,
                "lastReportDate": r.date or r.uploaded_at.strftime("%Y-%m-%d"),
                "lastReportId": r.id,
            }

        pdata = patient_map[mrn]
        pdata["reportCount"] += 1
        if not r.verified:
            pdata["unverifiedCount"] += 1
        if info and info.lab_results:
            try:
                labs = json.loads(info.lab_results)
                if any(l.get("flag") in ("high", "low") for l in labs):
                    pdata["hasAbnormalLabs"] = True
            except Exception:
                pass

    patients_summary = [DoctorPatientSummary(**v) for v in patient_map.values()]

    return DoctorOverviewResponse(
        stats=stats,
        patients=patients_summary,
        criticalAlerts=critical_alerts[:15],
        pendingReports=pending_reports,
    )


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _time_ago(dt: datetime) -> str:
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    total_sec = max(0, int((now - dt).total_seconds()))
    if total_sec < 60:
        return "Just now"
    if total_sec < 3600:
        return f"{total_sec // 60}m ago"
    if total_sec < 86400:
        return f"{total_sec // 3600}h ago"
    return f"{total_sec // 86400}d ago"


"""
Emergency QR Code router.
Creates a short-lived token embedded in a QR code URL.
On scan + auth, returns AI summary + original reports for the patient.
"""
from __future__ import annotations

import json
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import EmergencyQRToken, MedicalReport, User
from schemas import PatientInfo, QRCreateResponse, QRVerifyResponse
from security import get_current_user
from routers.reports import _build_report_response

router = APIRouter(prefix="/qr", tags=["qr"])

QR_TOKEN_HOURS = 24  # QR valid for 24 hours by default


@router.post("/create", response_model=QRCreateResponse)
def create_qr(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Deactivate any existing tokens
    db.query(EmergencyQRToken).filter(
        EmergencyQRToken.owner_id == current_user.id,
        EmergencyQRToken.is_active == True,
    ).update({"is_active": False})
    db.commit()

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=QR_TOKEN_HOURS)
    qr_record = EmergencyQRToken(
        owner_id=current_user.id,
        token=token,
        is_active=True,
        expires_at=expires,
    )
    db.add(qr_record)
    db.commit()

    qr_url = f"/qr/verify/{token}"
    return QRCreateResponse(
        token=token,
        qr_url=qr_url,
        expires_at=expires.isoformat(),
    )


@router.get("/verify/{token}", response_model=QRVerifyResponse)
def verify_qr(
    token: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),  # requires auth to prevent public scraping
):
    qr_record = db.query(EmergencyQRToken).filter(
        EmergencyQRToken.token == token,
        EmergencyQRToken.is_active == True,
    ).first()
    if not qr_record:
        raise HTTPException(status_code=404, detail="QR token not found or inactive.")

    now = datetime.now(timezone.utc)
    expires = qr_record.expires_at
    if expires:
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if now > expires:
            raise HTTPException(status_code=410, detail="QR code has expired.")

    owner = qr_record.owner
    if not owner:
        raise HTTPException(status_code=404, detail="Patient not found.")

    reports = (
        db.query(MedicalReport)
        .filter(
            MedicalReport.owner_id == owner.id,
            MedicalReport.status == "completed",
        )
        .order_by(MedicalReport.uploaded_at.desc())
        .limit(10)
        .all()
    )

    # Aggregate health snapshot
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

    patient = PatientInfo(
        name=owner.full_name,
        age=0,
        gender="",
        patientId="",
    )

    return QRVerifyResponse(
        patient=patient,
        conditions=sorted(conditions),
        medications=sorted(medications),
        allergies=sorted(allergies),
        reports=[_build_report_response(r) for r in reports],
    )

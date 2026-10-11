"""
SQLAlchemy ORM models — matches the class diagram from the abstract.
Tables: users, medical_reports, medical_information, summaries,
        medical_codes, structured_reports, record_shares,
        emergency_qr_tokens, audit_logs
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, String, Text, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String, nullable=False, default="")
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default="patient",
    )
    license_number: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )

    # password-reset OTP (stored plain for simplicity; valid for 10 min)
    reset_otp: Mapped[str | None] = mapped_column(String, nullable=True)
    reset_otp_expires: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # relationships
    reports: Mapped[list[MedicalReport]] = relationship(
        "MedicalReport", back_populates="owner", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[list[AuditLog]] = relationship(
        "AuditLog", back_populates="user", cascade="all, delete-orphan"
    )
    qr_tokens: Mapped[list[EmergencyQRToken]] = relationship(
        "EmergencyQRToken", back_populates="owner", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Medical Reports (upload + pipeline status)
# ---------------------------------------------------------------------------
class MedicalReport(Base):
    __tablename__ = "medical_reports"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String, nullable=False, default="")
    report_type: Mapped[str] = mapped_column(String, nullable=False, default="lab")
    date: Mapped[str] = mapped_column(String, nullable=False, default="")  # ISO date YYYY-MM-DD
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    status: Mapped[str] = mapped_column(String, nullable=False, default="uploaded")
    facility: Mapped[str] = mapped_column(String, nullable=False, default="")
    doctor: Mapped[str] = mapped_column(String, nullable=False, default="")
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mime: Mapped[str] = mapped_column(String, nullable=False, default="application/pdf")
    file_path: Mapped[str] = mapped_column(String, nullable=False)  # path on disk
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False, default="")

    owner: Mapped[User] = relationship("User", back_populates="reports")
    medical_information: Mapped[MedicalInformation | None] = relationship(
        "MedicalInformation", back_populates="report", uselist=False, cascade="all, delete-orphan"
    )
    summary: Mapped[Summary | None] = relationship(
        "Summary", back_populates="report", uselist=False, cascade="all, delete-orphan"
    )
    codes: Mapped[list[MedicalCode]] = relationship(
        "MedicalCode", back_populates="report", cascade="all, delete-orphan"
    )
    structured_report: Mapped[StructuredReport | None] = relationship(
        "StructuredReport", back_populates="report", uselist=False, cascade="all, delete-orphan"
    )
    shares: Mapped[list[RecordShare]] = relationship(
        "RecordShare", back_populates="report", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Medical Information (extracted fields)
# ---------------------------------------------------------------------------
class MedicalInformation(Base):
    __tablename__ = "medical_information"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    report_id: Mapped[str] = mapped_column(
        String, ForeignKey("medical_reports.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    patient_name: Mapped[str] = mapped_column(String, nullable=False, default="")
    patient_age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    patient_gender: Mapped[str] = mapped_column(String, nullable=False, default="")
    patient_mrn: Mapped[str] = mapped_column(String, nullable=False, default="")
    symptoms: Mapped[str] = mapped_column(Text, nullable=False, default="[]")  # JSON array
    diagnosis: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    medications: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    allergies: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    lab_results: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    treatment: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    follow_up: Mapped[str] = mapped_column(Text, nullable=False, default="")
    extracted_fields: Mapped[str] = mapped_column(Text, nullable=False, default="[]")  # [{label,value}]

    report: Mapped[MedicalReport] = relationship("MedicalReport", back_populates="medical_information")


# ---------------------------------------------------------------------------
# AI Summaries
# ---------------------------------------------------------------------------
class Summary(Base):
    __tablename__ = "summaries"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    report_id: Mapped[str] = mapped_column(
        String, ForeignKey("medical_reports.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    overview: Mapped[str] = mapped_column(Text, nullable=False, default="")
    diagnosis: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    treatment: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    medications: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    labs: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    disclaimer: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default=(
            "This AI-generated summary is for informational purposes only. "
            "Always verify against the original report and consult a qualified healthcare professional."
        ),
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    report: Mapped[MedicalReport] = relationship("MedicalReport", back_populates="summary")


# ---------------------------------------------------------------------------
# Medical Codes (ICD-10, CPT, LOINC, SNOMED CT)
# ---------------------------------------------------------------------------
class MedicalCode(Base):
    __tablename__ = "medical_codes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    report_id: Mapped[str] = mapped_column(
        String, ForeignKey("medical_reports.id", ondelete="CASCADE"), nullable=False, index=True
    )
    system: Mapped[str] = mapped_column(String, nullable=False)  # ICD-10 | CPT | LOINC | SNOMED CT
    code: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False, default="")
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    report: Mapped[MedicalReport] = relationship("MedicalReport", back_populates="codes")


# ---------------------------------------------------------------------------
# Structured Reports (machine-readable full extraction)
# ---------------------------------------------------------------------------
class StructuredReport(Base):
    __tablename__ = "structured_reports"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    report_id: Mapped[str] = mapped_column(
        String, ForeignKey("medical_reports.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False, default="{}")  # full JSON

    report: Mapped[MedicalReport] = relationship("MedicalReport", back_populates="structured_report")


# ---------------------------------------------------------------------------
# Record Shares
# ---------------------------------------------------------------------------
class RecordShare(Base):
    __tablename__ = "record_shares"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    report_id: Mapped[str] = mapped_column(
        String, ForeignKey("medical_reports.id", ondelete="CASCADE"), nullable=False
    )
    shared_with_email: Mapped[str] = mapped_column(String, nullable=False)
    shared_by_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    report: Mapped[MedicalReport] = relationship("MedicalReport", back_populates="shares")


# ---------------------------------------------------------------------------
# Emergency QR Tokens
# ---------------------------------------------------------------------------
class EmergencyQRToken(Base):
    __tablename__ = "emergency_qr_tokens"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    owner: Mapped[User] = relationship("User", back_populates="qr_tokens")


# ---------------------------------------------------------------------------
# Audit Logs
# ---------------------------------------------------------------------------
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String, nullable=False)
    resource: Mapped[str] = mapped_column(String, nullable=False, default="")
    detail: Mapped[str] = mapped_column(Text, nullable=False, default="")
    ip_address: Mapped[str] = mapped_column(String, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped[User | None] = relationship("User", back_populates="audit_logs")

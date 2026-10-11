"""
Pydantic v2 schemas — these are the JSON shapes the frontend expects.
Match the TypeScript types in frontend/src/services/types.ts exactly.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(default="")
    role: str = Field(default="patient")
    license_number: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    full_name: str
    email: str
    role: str
    license_number: str | None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str = Field(min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class UpdateProfileRequest(BaseModel):
    full_name: str | None = None
    license_number: str | None = None


class ProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    license_number: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Core report sub-types (mirror frontend/src/services/types.ts)
# ---------------------------------------------------------------------------
class PatientInfo(BaseModel):
    name: str = ""
    age: int = 0
    gender: str = ""
    patientId: str = ""


class Medication(BaseModel):
    name: str = ""
    dose: str = ""
    frequency: str = ""
    duration: str = ""


class LabResult(BaseModel):
    test: str = ""
    value: str = ""
    unit: str = ""
    range: str = ""
    flag: Literal["high", "low", "normal"] = "normal"


class MedicalCode(BaseModel):
    system: Literal["ICD-10", "CPT", "LOINC", "SNOMED CT"] = "ICD-10"
    code: str = ""
    description: str = ""
    confidence: float = 0.0


class ReportSummary(BaseModel):
    overview: str = ""
    diagnosis: list[str] = []
    treatment: list[str] = []
    medications: list[Medication] = []
    labs: list[LabResult] = []


class ExtractedField(BaseModel):
    label: str
    value: str


class ReportResponse(BaseModel):
    id: str
    title: str
    type: str
    date: str
    uploadedAt: str
    status: str
    facility: str
    doctor: str
    fileName: str
    fileSize: int
    mime: str
    confidence: float
    verified: bool
    patient: PatientInfo
    summary: ReportSummary | None
    extracted: list[ExtractedField]
    codes: list[MedicalCode]
    rawText: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Dashboard / health snapshot
# ---------------------------------------------------------------------------
class DashboardStats(BaseModel):
    totalReports: int
    summaries: int
    processing: int
    lastUpload: str | None = None
    # Clinician / Doctor metrics
    totalPatients: int | None = None
    pendingReview: int | None = None
    flaggedAbnormal: int | None = None
    verifiedReports: int | None = None


class ClinicalAlert(BaseModel):
    id: str
    patientName: str
    patientMrn: str
    test: str
    value: str
    unit: str
    range: str
    flag: str  # high | low
    reportId: str
    reportTitle: str
    date: str


class DoctorPatientSummary(BaseModel):
    mrn: str
    name: str
    age: int
    gender: str
    diagnosis: list[str]
    reportCount: int
    unverifiedCount: int
    hasAbnormalLabs: bool
    lastReportDate: str
    lastReportId: str


class DoctorOverviewResponse(BaseModel):
    stats: DashboardStats
    patients: list[DoctorPatientSummary]
    criticalAlerts: list[ClinicalAlert]
    pendingReports: list[ReportResponse]


class HealthSnapshot(BaseModel):
    conditions: list[str]
    medications: list[str]
    allergies: list[str]


class AppNotification(BaseModel):
    id: str
    title: str
    body: str
    time: str
    read: bool


# ---------------------------------------------------------------------------
# Assistant
# ---------------------------------------------------------------------------
class AssistantRequest(BaseModel):
    question: str
    reportId: str | None = None


class AssistantResponse(BaseModel):
    answer: str
    disclaimer: str = (
        "AI responses are for informational purposes only. "
        "Always verify with your healthcare provider."
    )


# ---------------------------------------------------------------------------
# Compare reports
# ---------------------------------------------------------------------------
class LabDiff(BaseModel):
    test: str
    before: str
    after: str
    unit: str
    change: str  # "improved" | "worsened" | "stable"
    flagBefore: str
    flagAfter: str


class CompareResponse(BaseModel):
    report_a: str
    report_b: str
    diffs: list[LabDiff]
    narrative: str


# ---------------------------------------------------------------------------
# Timeline
# ---------------------------------------------------------------------------
class TimelineEvent(BaseModel):
    date: str
    title: str
    type: str
    facility: str
    doctor: str
    reportId: str
    status: str


# ---------------------------------------------------------------------------
# QR
# ---------------------------------------------------------------------------
class QRCreateResponse(BaseModel):
    token: str
    qr_url: str
    expires_at: str | None


class QRVerifyResponse(BaseModel):
    patient: PatientInfo
    conditions: list[str]
    medications: list[str]
    allergies: list[str]
    reports: list[ReportResponse]
    disclaimer: str = (
        "Emergency access granted. This information is AI-generated and must be "
        "verified against original records before clinical decisions."
    )


# ---------------------------------------------------------------------------
# Upload progress (polling)
# ---------------------------------------------------------------------------
class PipelineStatusResponse(BaseModel):
    reportId: str
    status: str  # uploaded | extracting | analyzing | completed | failed
    progress: int  # 0-100


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------
class AuditLogResponse(BaseModel):
    id: str
    action: str
    resource: str
    detail: str
    ip_address: str
    created_at: datetime

    model_config = {"from_attributes": True}

"""
Seed demo data on first startup.
Creates one user per role + 2 sample reports for the demo patient.
Run standalone: python seed_data.py
Or it's called automatically from main.py on startup.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Make sure the backend directory is on sys.path when run standalone
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from database import Base, SessionLocal, engine
from models import (
    MedicalCode as MedicalCodeModel,
    MedicalInformation,
    MedicalReport,
    Summary,
    User,
)
from security import hash_password

# ---------------------------------------------------------------------------
# Demo credentials  (printed to console on first run)
# ---------------------------------------------------------------------------
DEMO_USERS = [
    {
        "email": "patient@medilens.demo",
        "password": "MediLens@123",
        "full_name": "Ravi Kumar",
        "role": "patient",
        "license_number": None,
    },
    {
        "email": "doctor@medilens.demo",
        "password": "MediLens@123",
        "full_name": "Dr. Anjali Mehta",
        "role": "doctor",
        "license_number": "TSMC-48213",
    },
    {
        "email": "specialist@medilens.demo",
        "password": "MediLens@123",
        "full_name": "Dr. K. Srinivas",
        "role": "specialist",
        "license_number": "TSMC-77654",
    },
    {
        "email": "coder@medilens.demo",
        "password": "MediLens@123",
        "full_name": "Priya Sharma",
        "role": "medical_coder",
        "license_number": None,
    },
    {
        "email": "researcher@medilens.demo",
        "password": "MediLens@123",
        "full_name": "Dr. Ramesh Naidu",
        "role": "researcher",
        "license_number": None,
    },
    {
        "email": "insurer@medilens.demo",
        "password": "MediLens@123",
        "full_name": "Sunita Patel",
        "role": "insurance_provider",
        "license_number": None,
    },
]

# ---------------------------------------------------------------------------
# Sample reports for the demo patient
# ---------------------------------------------------------------------------
SAMPLE_REPORTS = [
    {
        "title": "HbA1c & Blood Sugar Panel",
        "report_type": "lab",
        "date": "2026-09-08",
        "facility": "Apollo Diagnostics, Hyderabad",
        "doctor": "Dr. Anjali Mehta",
        "file_name": "hba1c-2026-09-08.pdf",
        "file_size": 412_000,
        "mime": "application/pdf",
        "confidence": 93.0,
        "verified": True,
        "raw_text": """APOLLO DIAGNOSTICS — HYDERABAD
LABORATORY REPORT

Patient: Ravi Kumar     Age/Sex: 52/M     MRN: MRN-204718
Referred by: Dr. Anjali Mehta      Collected: 2026-09-08

TEST                          RESULT      UNIT     REFERENCE
Glycated Hemoglobin (HbA1c)   7.1         %        4.0 - 5.6
Fasting Blood Sugar           126         mg/dL    70 - 100
Post Prandial Blood Sugar     172         mg/dL    < 140
Serum Creatinine              1.0         mg/dL    0.7 - 1.3

Method: HPLC (HbA1c), Hexokinase (Glucose)
-- End of report --""",
        "info": {
            "patient_name": "Ravi Kumar",
            "patient_age": 52,
            "patient_gender": "Male",
            "patient_mrn": "MRN-204718",
            "diagnosis": ["Type 2 Diabetes Mellitus", "Glycemic control improving"],
            "medications": [
                {"name": "Metformin", "dose": "500 mg", "frequency": "Twice daily after meals", "duration": "Ongoing"},
                {"name": "Glimepiride", "dose": "1 mg", "frequency": "Once daily before breakfast", "duration": "Ongoing"},
            ],
            "allergies": ["Penicillin", "Sulfa drugs"],
            "lab_results": [
                {"test": "HbA1c", "value": "7.1", "unit": "%", "range": "4.0 – 5.6", "flag": "high"},
                {"test": "Fasting Blood Sugar", "value": "126", "unit": "mg/dL", "range": "70 – 100", "flag": "high"},
                {"test": "Post Prandial Blood Sugar", "value": "172", "unit": "mg/dL", "range": "< 140", "flag": "high"},
                {"test": "Serum Creatinine", "value": "1.0", "unit": "mg/dL", "range": "0.7 – 1.3", "flag": "normal"},
            ],
            "extracted_fields": [
                {"label": "Patient", "value": "Ravi Kumar, 52 y, Male"},
                {"label": "MRN", "value": "MRN-204718"},
                {"label": "Report date", "value": "2026-09-08"},
                {"label": "Doctor", "value": "Dr. Anjali Mehta"},
                {"label": "Facility", "value": "Apollo Diagnostics, Hyderabad"},
                {"label": "HbA1c", "value": "7.1 % (HIGH)"},
                {"label": "Fasting Blood Sugar", "value": "126 mg/dL (HIGH)"},
            ],
        },
        "summary": {
            "overview": "HbA1c has improved to 7.1%, close to the usual target of below 7%. Fasting and post-meal sugars are still mildly raised. Kidney function (creatinine) is normal.",
            "diagnosis": ["Type 2 Diabetes Mellitus", "Glycemic control improving"],
            "treatment": ["Continue oral hypoglycemics", "Low-carbohydrate diet, 30 min walk daily", "Repeat HbA1c in 3 months"],
            "medications": [
                {"name": "Metformin", "dose": "500 mg", "frequency": "Twice daily after meals", "duration": "Ongoing"},
                {"name": "Glimepiride", "dose": "1 mg", "frequency": "Once daily before breakfast", "duration": "Ongoing"},
            ],
            "labs": [
                {"test": "HbA1c", "value": "7.1", "unit": "%", "range": "4.0 – 5.6", "flag": "high"},
                {"test": "Fasting Blood Sugar", "value": "126", "unit": "mg/dL", "range": "70 – 100", "flag": "high"},
                {"test": "Post Prandial Blood Sugar", "value": "172", "unit": "mg/dL", "range": "< 140", "flag": "high"},
                {"test": "Serum Creatinine", "value": "1.0", "unit": "mg/dL", "range": "0.7 – 1.3", "flag": "normal"},
            ],
        },
        "codes": [
            {"system": "ICD-10", "code": "E11.65", "description": "Type 2 diabetes mellitus with hyperglycemia", "confidence": 0.94},
            {"system": "CPT", "code": "83036", "description": "Hemoglobin; glycosylated (A1C)", "confidence": 0.97},
            {"system": "CPT", "code": "82947", "description": "Glucose; quantitative, blood", "confidence": 0.95},
            {"system": "LOINC", "code": "4548-4", "description": "Hemoglobin A1c/Hemoglobin.total in Blood", "confidence": 0.96},
        ],
    },
    {
        "title": "Prescription — Diabetes Follow-up",
        "report_type": "prescription",
        "date": "2026-09-10",
        "facility": "Sunrise Diabetes Clinic",
        "doctor": "Dr. Anjali Mehta",
        "file_name": "prescription-2026-09-10.jpg",
        "file_size": 1_240_000,
        "mime": "image/jpeg",
        "confidence": 88.0,
        "verified": False,
        "raw_text": """SUNRISE DIABETES CLINIC
Dr. Anjali Mehta, MD (Internal Medicine) — Reg. TSMC-48213

Name: Ravi Kumar   Age: 52   Date: 10/09/2026
BP: 138/86   Wt: 81 kg

Dx: T2DM (improving), HTN, Lumbar radiculopathy

Rx
1. Tab Metformin 500 mg      1-0-1  x 90 days
2. Tab Glimepiride 1 mg      1-0-0  x 90 days
3. Tab Telmisartan 40 mg     1-0-0  x 90 days
4. Cap Pregabalin 75 mg      0-0-1  x 30 days

Advice: Physiotherapy x10 sessions. Diet & walk.
Review after 3 months with HbA1c.""",
        "info": {
            "patient_name": "Ravi Kumar",
            "patient_age": 52,
            "patient_gender": "Male",
            "patient_mrn": "",
            "diagnosis": ["Type 2 Diabetes Mellitus — improving", "Essential hypertension", "Lumbar radiculopathy"],
            "medications": [
                {"name": "Metformin", "dose": "500 mg", "frequency": "1-0-1 after food", "duration": "90 days"},
                {"name": "Glimepiride", "dose": "1 mg", "frequency": "1-0-0 before breakfast", "duration": "90 days"},
                {"name": "Telmisartan", "dose": "40 mg", "frequency": "1-0-0", "duration": "90 days"},
                {"name": "Pregabalin", "dose": "75 mg", "frequency": "0-0-1 at bedtime", "duration": "30 days"},
            ],
            "allergies": [],
            "lab_results": [],
            "extracted_fields": [
                {"label": "Prescriber", "value": "Dr. Anjali Mehta, MD (Reg. TSMC-48213)"},
                {"label": "Date", "value": "2026-09-10"},
                {"label": "BP recorded", "value": "138/86 mmHg"},
                {"label": "Weight", "value": "81 kg"},
                {"label": "Next visit", "value": "2026-12-10"},
            ],
        },
        "summary": {
            "overview": "Follow-up prescription continuing diabetes and blood pressure medicines, with Pregabalin added for back pain radiating to the leg.",
            "diagnosis": ["Type 2 Diabetes Mellitus — improving", "Essential hypertension", "Lumbar radiculopathy"],
            "treatment": ["Continue current diabetes regimen", "Physiotherapy for lower back, 10 sessions", "Review in 3 months with HbA1c"],
            "medications": [
                {"name": "Metformin", "dose": "500 mg", "frequency": "1-0-1 after food", "duration": "90 days"},
                {"name": "Glimepiride", "dose": "1 mg", "frequency": "1-0-0 before breakfast", "duration": "90 days"},
                {"name": "Telmisartan", "dose": "40 mg", "frequency": "1-0-0", "duration": "90 days"},
                {"name": "Pregabalin", "dose": "75 mg", "frequency": "0-0-1 at bedtime", "duration": "30 days"},
            ],
            "labs": [],
        },
        "codes": [
            {"system": "ICD-10", "code": "E11.9", "description": "Type 2 diabetes mellitus without complications", "confidence": 0.90},
            {"system": "ICD-10", "code": "I10", "description": "Essential (primary) hypertension", "confidence": 0.93},
            {"system": "ICD-10", "code": "M54.16", "description": "Radiculopathy, lumbar region", "confidence": 0.84},
            {"system": "ICD-10", "code": "Z79.84", "description": "Long term use of oral hypoglycemic drugs", "confidence": 0.89},
        ],
    },
]


def seed_demo_data(db) -> None:
    """Only seeds if the database is empty (no users yet)."""
    Base.metadata.create_all(bind=engine)
    if db.query(User).count() > 0:
        return  # Already seeded

    print("\n[MediLens] Seeding demo data...")

    # Create users
    user_map: dict[str, User] = {}
    for u in DEMO_USERS:
        user = User(
            email=u["email"],
            full_name=u["full_name"],
            hashed_password=hash_password(u["password"]),
            role=u["role"],
            license_number=u.get("license_number"),
        )
        db.add(user)
        db.flush()
        user_map[u["role"]] = user

    db.commit()

    # Create sample reports for the patient user
    patient = user_map.get("patient")
    if not patient:
        return

    # Create a placeholder file path (no actual file — seeded reports show sample data)
    uploads_dir = Path(os.getenv("UPLOAD_DIR", "./uploads"))
    uploads_dir.mkdir(parents=True, exist_ok=True)

    for rd in SAMPLE_REPORTS:
        # Create a tiny placeholder file
        placeholder_name = f"seed_{rd['file_name']}"
        placeholder_path = uploads_dir / placeholder_name
        if not placeholder_path.exists():
            placeholder_path.write_bytes(b"[Seeded demo file - upload a real document to replace]")

        report = MedicalReport(
            owner_id=patient.id,
            title=rd["title"],
            report_type=rd["report_type"],
            date=rd["date"],
            uploaded_at=datetime(2026, 9, 10, 10, 0, 0, tzinfo=timezone.utc),
            status="completed",
            facility=rd["facility"],
            doctor=rd["doctor"],
            file_name=rd["file_name"],
            file_size=rd["file_size"],
            mime=rd["mime"],
            file_path=str(placeholder_path),
            confidence=rd["confidence"],
            verified=rd["verified"],
            raw_text=rd["raw_text"],
        )
        db.add(report)
        db.flush()

        info_data = rd["info"]
        info = MedicalInformation(
            report_id=report.id,
            patient_name=info_data["patient_name"],
            patient_age=info_data["patient_age"],
            patient_gender=info_data["patient_gender"],
            patient_mrn=info_data.get("patient_mrn", ""),
            symptoms=json.dumps([]),
            diagnosis=json.dumps(info_data["diagnosis"]),
            medications=json.dumps(info_data["medications"]),
            allergies=json.dumps(info_data["allergies"]),
            lab_results=json.dumps(info_data["lab_results"]),
            treatment=json.dumps(info_data.get("treatment", [])),
            follow_up="",
            extracted_fields=json.dumps(info_data["extracted_fields"]),
        )
        db.add(info)

        summ_data = rd["summary"]
        summary = Summary(
            report_id=report.id,
            overview=summ_data["overview"],
            diagnosis=json.dumps(summ_data["diagnosis"]),
            treatment=json.dumps(summ_data["treatment"]),
            medications=json.dumps(summ_data["medications"]),
            labs=json.dumps(summ_data["labs"]),
        )
        db.add(summary)

        for c in rd["codes"]:
            db.add(MedicalCodeModel(
                report_id=report.id,
                system=c["system"],
                code=c["code"],
                description=c["description"],
                confidence=c["confidence"],
            ))

    db.commit()

    print("[MediLens] Demo data seeded successfully!")
    print("\n[MediLens] Demo login credentials:")
    print("-" * 45)
    for u in DEMO_USERS:
        print(f"  Role: {u['role']:<20} Email: {u['email']}")
    print(f"  Password for all: MediLens@123")
    print("-" * 45 + "\n")


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()

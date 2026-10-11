"""
Medical information extraction from raw document text.
Uses regex/rules + built-in medical knowledge lists.
No external API needed — works fully offline.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

# ---------------------------------------------------------------------------
# Built-in reference data (subset; extend with your datasets CSVs)
# ---------------------------------------------------------------------------

COMMON_MEDICINES: list[str] = [
    "Metformin", "Glimepiride", "Glibenclamide", "Glipizide",
    "Insulin", "Liraglutide", "Sitagliptin", "Empagliflozin", "Dapagliflozin",
    "Telmisartan", "Amlodipine", "Losartan", "Enalapril", "Ramipril",
    "Atorvastatin", "Rosuvastatin", "Simvastatin",
    "Aspirin", "Clopidogrel", "Warfarin", "Rivaroxaban",
    "Metoprolol", "Atenolol", "Carvedilol",
    "Pregabalin", "Gabapentin", "Amitriptyline",
    "Omeprazole", "Pantoprazole", "Rabeprazole",
    "Paracetamol", "Ibuprofen", "Diclofenac",
    "Azithromycin", "Amoxicillin", "Ciprofloxacin", "Levofloxacin",
    "Cetirizine", "Fexofenadine", "Montelukast",
    "Levothyroxine", "Prednisolone", "Dexamethasone",
    "Furosemide", "Spironolactone", "Hydrochlorothiazide",
    "Vitamin D3", "Calcium carbonate", "Ferrous sulphate",
]

DISEASE_KEYWORDS: dict[str, list[str]] = {
    "Type 2 Diabetes Mellitus": ["diabetes", "t2dm", "hba1c", "blood sugar", "hyperglycemia", "hypoglycemia"],
    "Hypertension": ["hypertension", "high blood pressure", "htn", "bp elevated"],
    "Hypothyroidism": ["hypothyroid", "tsh elevated", "levothyroxine"],
    "Hyperthyroidism": ["hyperthyroid", "tsh low", "thyrotoxicosis"],
    "Dyslipidemia": ["dyslipidemia", "hypercholesterolemia", "ldl elevated", "triglyceride"],
    "Coronary Artery Disease": ["cad", "ischemic heart", "angina", "myocardial infarction", "mi"],
    "Chronic Kidney Disease": ["ckd", "chronic kidney", "creatinine elevated", "egfr"],
    "Lumbar Disc Disease": ["disc bulge", "disc herniation", "lumbar", "l4", "l5", "spondylosis"],
    "Anemia": ["anemia", "hemoglobin low", "hgb low", "iron deficiency"],
    "Asthma": ["asthma", "bronchospasm", "wheeze", "salbutamol"],
    "COPD": ["copd", "chronic obstructive", "emphysema"],
    "Urinary Tract Infection": ["uti", "urinary tract infection", "pus cells", "dysuria"],
}

# Lab reference ranges — (low, high, unit)
LAB_RANGES: dict[str, tuple[float, float, str]] = {
    "hemoglobin":       (13.0, 17.0, "g/dL"),
    "hba1c":            (4.0,  5.6,  "%"),
    "fasting blood sugar": (70.0, 100.0, "mg/dL"),
    "fasting glucose":  (70.0, 100.0, "mg/dL"),
    "post prandial":    (0.0,  140.0, "mg/dL"),
    "serum creatinine": (0.7,  1.3,  "mg/dL"),
    "ldl cholesterol":  (0.0,  100.0, "mg/dL"),
    "hdl cholesterol":  (40.0, 999.0, "mg/dL"),
    "total cholesterol":(0.0,  200.0, "mg/dL"),
    "triglycerides":    (0.0,  150.0, "mg/dL"),
    "tsh":              (0.4,  4.0,  "mIU/L"),
    "sodium":           (136.0, 145.0, "mEq/L"),
    "potassium":        (3.5,  5.0,  "mEq/L"),
    "urea":             (15.0, 45.0, "mg/dL"),
    "uric acid":        (3.5,  7.2,  "mg/dL"),
    "wbc":              (4.0,  11.0, "x10^3/µL"),
    "platelet":         (150.0, 400.0, "x10^3/µL"),
}


@dataclass
class ExtractionResult:
    patient_name: str = ""
    patient_age: int = 0
    patient_gender: str = ""
    patient_mrn: str = ""
    symptoms: list[str] = field(default_factory=list)
    diagnosis: list[str] = field(default_factory=list)
    medications: list[dict[str, str]] = field(default_factory=list)
    allergies: list[str] = field(default_factory=list)
    lab_results: list[dict[str, str]] = field(default_factory=list)
    treatment: list[str] = field(default_factory=list)
    follow_up: str = ""
    extracted_fields: list[dict[str, str]] = field(default_factory=list)
    facility: str = ""
    doctor: str = ""
    date: str = ""


def extract_medical_info(text: str, report_type: str = "lab") -> ExtractionResult:
    result = ExtractionResult()
    lines = text.splitlines()

    _extract_patient(text, lines, result)
    _extract_doctor_facility(text, lines, result)
    _extract_date(text, result)
    _extract_diagnoses(text, result)
    _extract_medications(text, lines, result)
    _extract_allergies(text, result)
    _extract_lab_results(text, lines, result)
    _extract_follow_up(text, result)
    _build_extracted_fields(result)

    return result


# ---------------------------------------------------------------------------
# Individual extractors
# ---------------------------------------------------------------------------

def _extract_patient(text: str, lines: list[str], r: ExtractionResult) -> None:
    # Name
    m = re.search(
        r"(?:patient|name|pt\.?)\s*[:\-–]?\s*([A-Z][a-zA-Z\.\s]{2,40})",
        text, re.IGNORECASE
    )
    if m:
        r.patient_name = m.group(1).strip().title()

    # Age
    m = re.search(r"(?:age|aged?)\s*[:\-–/]?\s*(\d{1,3})\s*(?:yrs?|years?|y)?", text, re.IGNORECASE)
    if m:
        try:
            r.patient_age = int(m.group(1))
        except ValueError:
            pass

    # Gender
    if re.search(r"\b(?:male|m)\b", text, re.IGNORECASE):
        r.patient_gender = "Male"
    elif re.search(r"\b(?:female|f)\b", text, re.IGNORECASE):
        r.patient_gender = "Female"

    # MRN
    m = re.search(r"(?:mrn|patient\s*id|pid|reg\.?\s*no)\s*[:\-–]?\s*([A-Z0-9\-]{4,20})", text, re.IGNORECASE)
    if m:
        r.patient_mrn = m.group(1).strip()


def _extract_doctor_facility(text: str, lines: list[str], r: ExtractionResult) -> None:
    m = re.search(
        r"(?:dr\.?|doctor|physician|referred\s+by)\s*[:\-–]?\s*(Dr\.?\s*[A-Z][a-zA-Z\.\s]{2,40})",
        text, re.IGNORECASE
    )
    if m:
        r.doctor = m.group(1).strip()

    # Facility: first line that looks like a hospital/clinic/lab name
    for line in lines[:5]:
        if re.search(
            r"(hospital|clinic|lab|diagnostic|imaging|centre|center|medical|health)",
            line, re.IGNORECASE
        ):
            r.facility = line.strip()
            break


def _extract_date(text: str, r: ExtractionResult) -> None:
    # Try YYYY-MM-DD first, then DD/MM/YYYY, then DD-MM-YYYY
    m = re.search(r"(\d{4}-\d{2}-\d{2})", text)
    if m:
        r.date = m.group(1)
        return
    m = re.search(r"(\d{2})[/\-](\d{2})[/\-](\d{4})", text)
    if m:
        r.date = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"


def _extract_diagnoses(text: str, r: ExtractionResult) -> None:
    lower = text.lower()
    for disease, keywords in DISEASE_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in lower:
                if disease not in r.diagnosis:
                    r.diagnosis.append(disease)
                break

    # Also look for explicit diagnosis/dx lines
    for m in re.finditer(r"(?:dx|diagnosis|impression)\s*[:\-–]\s*(.+)", text, re.IGNORECASE):
        line = m.group(1).strip()
        if line and line not in r.diagnosis:
            r.diagnosis.append(line)


def _extract_medications(text: str, lines: list[str], r: ExtractionResult) -> None:
    lower = text.lower()

    # Pattern: "Tab Metformin 500mg 1-0-1 x 90 days" or similar
    rx_pattern = re.compile(
        r"(?:tab(?:let)?|cap(?:sule)?|inj(?:ection)?|syr(?:up)?|drop|cream|oint)\s+"
        r"([A-Za-z\s]+?)\s+"
        r"(\d+\s*(?:mg|mcg|ml|iu|units?))\s*"
        r"([\d\-]+-[\d\-]+(?:-[\d\-]+)?|once|twice|thrice|od|bd|tds|qid|sos)?"
        r"[^\n]{0,40}",
        re.IGNORECASE
    )
    for m in rx_pattern.finditer(text):
        med: dict[str, str] = {
            "name": m.group(1).strip().title(),
            "dose": m.group(2).strip() if m.group(2) else "",
            "frequency": m.group(3).strip() if m.group(3) else "",
            "duration": "",
        }
        # Try to find duration near the match
        dur = re.search(r"x\s*(\d+\s*(?:days?|weeks?|months?))", m.group(0), re.IGNORECASE)
        if dur:
            med["duration"] = dur.group(1)
        if med["name"] and not any(
            existing["name"].lower() == med["name"].lower() for existing in r.medications
        ):
            r.medications.append(med)

    # Fallback: look for known medicine names
    if not r.medications:
        for med_name in COMMON_MEDICINES:
            if med_name.lower() in lower:
                r.medications.append({"name": med_name, "dose": "", "frequency": "", "duration": ""})


def _extract_allergies(text: str, r: ExtractionResult) -> None:
    m = re.search(
        r"(?:allerg(?:y|ies|ic\s+to)?|known\s+allerg(?:y|ies))\s*[:\-–]?\s*(.+)",
        text, re.IGNORECASE
    )
    if m:
        raw = m.group(1).strip()
        # Split on comma/semicolon
        for part in re.split(r"[,;/]", raw):
            part = part.strip()
            if part and len(part) < 60:
                r.allergies.append(part)


def _extract_lab_results(text: str, lines: list[str], r: ExtractionResult) -> None:
    """
    Match patterns like:
      Hemoglobin            12.4    g/dL    13.0 - 17.0
      HbA1c                 7.1     %       4.0 - 5.6
    """
    lab_pattern = re.compile(
        r"([A-Za-z][A-Za-z1\s\-/()\.]{2,40}?)\s+"
        r"(\d+\.?\d*)\s+"
        r"(g/dL|mg/dL|%|mIU/L|mEq/L|U/L|IU/L|mmol/L|µmol/L|ng/mL|pg/mL|x10\^3[/µ]µL|[a-zA-Z/%]+)\s+"
        r"([\d\.\s–\-<>]+)",
        re.IGNORECASE,
    )
    for m in lab_pattern.finditer(text):
        test_name = m.group(1).strip()
        value_str = m.group(2).strip()
        unit = m.group(3).strip()
        ref_range = m.group(4).strip()

        if len(test_name) < 3 or not value_str:
            continue

        flag = _flag_lab(test_name.lower(), value_str, ref_range)
        result_item = {
            "test": test_name,
            "value": value_str,
            "unit": unit,
            "range": ref_range,
            "flag": flag,
        }
        if not any(x["test"].lower() == test_name.lower() for x in r.lab_results):
            r.lab_results.append(result_item)


def _flag_lab(test_lower: str, value_str: str, ref_range: str) -> str:
    """Return 'high', 'low', or 'normal'."""
    try:
        value = float(value_str)
    except ValueError:
        return "normal"

    # Try built-in ranges first
    for key, (lo, hi, _unit) in LAB_RANGES.items():
        if key in test_lower:
            if value < lo:
                return "low"
            if value > hi:
                return "high"
            return "normal"

    # Parse the ref_range string
    ref_range = ref_range.replace("–", "-")
    m = re.search(r"([\d\.]+)\s*[-–]\s*([\d\.]+)", ref_range)
    if m:
        try:
            lo, hi = float(m.group(1)), float(m.group(2))
            if value < lo:
                return "low"
            if value > hi:
                return "high"
            return "normal"
        except ValueError:
            pass
    m = re.search(r"<\s*([\d\.]+)", ref_range)
    if m:
        try:
            if value >= float(m.group(1)):
                return "high"
            return "normal"
        except ValueError:
            pass
    return "normal"


def _extract_follow_up(text: str, r: ExtractionResult) -> None:
    m = re.search(
        r"(?:follow[- ]?up|review|next\s+visit|return\s+in)\s*[:\-–]?\s*(.+)",
        text, re.IGNORECASE
    )
    if m:
        r.follow_up = m.group(1).strip()[:200]


def _build_extracted_fields(r: ExtractionResult) -> None:
    fields: list[dict[str, str]] = []
    if r.patient_name:
        fields.append({"label": "Patient", "value": r.patient_name})
    if r.patient_age:
        parts = [str(r.patient_age)]
        if r.patient_gender:
            parts.append(r.patient_gender)
        fields.append({"label": "Age / Gender", "value": ", ".join(parts)})
    if r.patient_mrn:
        fields.append({"label": "MRN", "value": r.patient_mrn})
    if r.date:
        fields.append({"label": "Report date", "value": r.date})
    if r.doctor:
        fields.append({"label": "Doctor", "value": r.doctor})
    if r.facility:
        fields.append({"label": "Facility", "value": r.facility})
    for lab in r.lab_results:
        fields.append({"label": lab["test"], "value": f"{lab['value']} {lab['unit']} ({lab['flag'].upper()})"})
    if r.follow_up:
        fields.append({"label": "Follow-up", "value": r.follow_up})
    r.extracted_fields = fields

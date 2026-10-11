"""
AI summarization service.
- If OPENAI_API_KEY is set: uses OpenAI GPT to generate structured summaries.
- Otherwise: falls back to a rule-based template summarizer (fully offline).

Both paths return the same dict shape:
  {
    "overview": str,
    "diagnosis": [str, ...],
    "treatment": [str, ...],
    "medications": [{"name","dose","frequency","duration"}, ...],
    "labs": [{"test","value","unit","range","flag"}, ...]
  }
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

DISCLAIMER = (
    "This AI-generated summary is for informational purposes only. "
    "Always verify against the original report and consult a qualified healthcare professional. "
    "MediLens never replaces the original document."
)

SYSTEM_PROMPT = """You are a medical document summarization assistant.
Given the raw text of a medical report, produce a JSON object with EXACTLY these keys:
{
  "overview": "<2-4 sentence plain-language summary>",
  "diagnosis": ["<diagnosis 1>", ...],
  "treatment": ["<instruction 1>", ...],
  "medications": [{"name":"","dose":"","frequency":"","duration":""}, ...],
  "labs": [{"test":"","value":"","unit":"","range":"","flag":"high|low|normal"}, ...]
}
Rules:
- Do NOT invent information not present in the document.
- Use only what the text contains.
- Output valid JSON with no markdown fences.
"""


def summarize(
    raw_text: str,
    report_type: str,
    extracted: dict[str, Any],
) -> dict[str, Any]:
    """
    Return a summary dict. Uses OpenAI if key is configured, else local fallback.
    `extracted` is the ExtractionResult dict from extraction_service.
    """
    if OPENAI_API_KEY:
        result = _openai_summarize(raw_text)
        if result:
            return result
        logger.warning("OpenAI summarization failed; falling back to local.")
    return _local_summarize(raw_text, report_type, extracted)


# ---------------------------------------------------------------------------
# OpenAI path
# ---------------------------------------------------------------------------

def _openai_summarize(raw_text: str) -> dict[str, Any] | None:
    try:
        from openai import OpenAI  # type: ignore

        client = OpenAI(api_key=OPENAI_API_KEY)
        # Truncate to avoid token limits
        truncated = raw_text[:6000]
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"REPORT TEXT:\n{truncated}"},
            ],
            temperature=0.2,
            max_tokens=1500,
        )
        content = response.choices[0].message.content or ""
        return json.loads(content)
    except Exception as exc:
        logger.warning("OpenAI call failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Local rule-based fallback
# ---------------------------------------------------------------------------

def _local_summarize(
    raw_text: str,
    report_type: str,
    extracted: dict[str, Any],
) -> dict[str, Any]:
    """
    Produce a structured summary from the extraction_service output.
    No AI required — deterministic, offline.
    """
    diagnosis: list[str] = extracted.get("diagnosis", [])
    medications: list[dict] = extracted.get("medications", [])
    lab_results: list[dict] = extracted.get("lab_results", [])
    follow_up: str = extracted.get("follow_up", "")
    patient_name: str = extracted.get("patient_name", "The patient")

    # Build overview
    if diagnosis:
        dx_str = ", ".join(diagnosis[:3])
        overview = (
            f"This {_report_label(report_type)} for {patient_name} documents the following: "
            f"{dx_str}. "
        )
    else:
        overview = (
            f"This {_report_label(report_type)} for {patient_name} has been processed by MediLens. "
        )

    # Highlight abnormal labs
    abnormal = [
        l for l in lab_results if l.get("flag") in ("high", "low")
    ]
    if abnormal:
        ab_str = ", ".join(
            f"{l['test']} {l['value']} {l['unit']} ({l['flag'].upper()})"
            for l in abnormal[:4]
        )
        overview += f"Notable findings: {ab_str}. "

    if follow_up:
        overview += f"Follow-up: {follow_up}."
    else:
        overview += "Please review the original document with your healthcare provider."

    treatment: list[str] = extracted.get("treatment", [])
    if not treatment:
        if medications:
            treatment = ["Continue prescribed medications as directed"]
        if follow_up:
            treatment.append(follow_up)
        if not treatment:
            treatment = ["Consult your doctor for further guidance"]

    return {
        "overview": overview.strip(),
        "diagnosis": diagnosis,
        "treatment": treatment,
        "medications": medications,
        "labs": lab_results,
    }


def _report_label(report_type: str) -> str:
    labels = {
        "lab": "laboratory report",
        "prescription": "prescription",
        "radiology": "radiology report",
        "discharge_summary": "discharge summary",
        "consultation_note": "consultation note",
        "follow_up": "follow-up note",
    }
    return labels.get(report_type, "medical document")


# ---------------------------------------------------------------------------
# Assistant Q&A
# ---------------------------------------------------------------------------

def answer_question(question: str, context: str) -> str:
    """
    Answer a question about a report.  Uses OpenAI if available, else local heuristic.
    """
    if OPENAI_API_KEY:
        answer = _openai_answer(question, context)
        if answer:
            return answer

    return _local_answer(question, context)


def _openai_answer(question: str, context: str) -> str | None:
    try:
        from openai import OpenAI  # type: ignore

        client = OpenAI(api_key=OPENAI_API_KEY)
        system = (
            "You are a helpful medical assistant. The user will ask questions about "
            "their medical reports. Use only the provided report context. "
            "Be concise, clear, and professional. "
            "If the answer is not in the context, say so."
        )
        truncated_context = context[:4000]
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"REPORT CONTEXT:\n{truncated_context}\n\nQUESTION: {question}"},
            ],
            temperature=0.3,
            max_tokens=600,
        )
        return response.choices[0].message.content or None
    except Exception as exc:
        logger.warning("OpenAI assistant call failed: %s", exc)
        return None


def _local_answer(question: str, context: str) -> str:
    q = question.lower()
    ctx = context.lower()

    if any(w in q for w in ["hba1c", "a1c", "sugar", "diabet", "glucose"]):
        return (
            "Based on the report, blood sugar and HbA1c values indicate glycemic status. "
            "Check the Labs tab for exact values and their flags. "
            "Consistently elevated values above target suggest sub-optimal control — consult your doctor."
        )
    if any(w in q for w in ["mri", "spine", "back", "disc", "lumbar", "l4", "l5"]):
        return (
            "The imaging report describes spinal findings. "
            "Disc bulges near nerve roots can cause radiating pain. "
            "Check the AI Summary tab for the impression. "
            "Physiotherapy is often the first line treatment; consult a spine specialist for severe symptoms."
        )
    if any(w in q for w in ["medic", "tablet", "drug", "pill", "capsule", "dosage", "rx"]):
        meds = []
        for med in ["metformin", "glimepiride", "telmisartan", "pregabalin", "atorvastatin",
                    "aspirin", "amlodipine", "omeprazole"]:
            if med in ctx:
                meds.append(med.title())
        if meds:
            return (
                f"The following medications appear in your report: {', '.join(meds)}. "
                "Please check the Medications section for dose and frequency details. "
                "Never change doses without consulting your prescriber."
            )
        return (
            "No specific medications were detected in this report. "
            "Please check the Extracted Info tab or refer to a prescription document."
        )
    if any(w in q for w in ["allerg"]):
        if "allerg" in ctx:
            return (
                "Allergy information was detected in this report. "
                "Check the Extracted Info tab for details. "
                "Always inform new healthcare providers of your known allergies."
            )
        return "No allergy information was detected in this report."
    if any(w in q for w in ["diagnos", "condition", "disease", "finding"]):
        return (
            "Diagnoses and clinical findings are listed in the AI Summary tab under Diagnoses. "
            "Check the original document for the full clinical context."
        )
    return (
        "I can help you understand your lab values, medications, diagnoses, imaging findings, "
        "and follow-up instructions. Try asking: 'What does my HbA1c mean?', "
        "'What medications am I taking?', or 'What did my MRI show?'"
    )

"""
Medical code generation (ICD-10, CPT, LOINC).
Uses a built-in lookup table; extend with your datasets CSVs.
"""
from __future__ import annotations

# ---------------------------------------------------------------------------
# ICD-10 mini-dictionary (condition → code, description, confidence)
# ---------------------------------------------------------------------------
ICD10_MAP: list[tuple[list[str], str, str, float]] = [
    # keywords,                          code,      description,                                  base_confidence
    (["type 2 diabetes", "t2dm", "hba1c"], "E11.9",  "Type 2 diabetes mellitus without complications", 0.88),
    (["hyperglycemia"],                    "E11.65", "Type 2 diabetes mellitus with hyperglycemia",     0.85),
    (["hypoglycemia"],                     "E11.649","Type 2 diabetes mellitus with hypoglycemia",      0.80),
    (["hypertension", "htn"],              "I10",    "Essential (primary) hypertension",                0.93),
    (["disc bulge", "disc herniation", "l4", "l5"],
                                           "M51.26", "Other intervertebral disc displacement, lumbar region", 0.85),
    (["spondylosis", "spondylitic"],       "M47.816","Spondylosis without myelopathy, lumbar region",   0.80),
    (["radiculopathy", "radicular"],       "M54.16", "Radiculopathy, lumbar region",                   0.82),
    (["dyslipidemia", "hypercholesterol"], "E78.5",  "Hyperlipidemia, unspecified",                    0.87),
    (["hypothyroid", "levothyroxine"],     "E03.9",  "Hypothyroidism, unspecified",                    0.85),
    (["anemia", "hemoglobin low"],         "D64.9",  "Anemia, unspecified",                            0.84),
    (["chronic kidney", "ckd"],            "N18.9",  "Chronic kidney disease, unspecified",            0.86),
    (["uti", "urinary tract infection"],   "N39.0",  "Urinary tract infection, site not specified",    0.88),
    (["coronary", "cad", "angina"],        "I25.10", "Atherosclerotic heart disease of native coronary artery", 0.82),
    (["asthma"],                           "J45.909","Unspecified asthma, uncomplicated",              0.88),
    (["copd"],                             "J44.1",  "Chronic obstructive pulmonary disease with acute exacerbation", 0.83),
    (["back pain", "low back"],            "M54.5",  "Low back pain",                                  0.80),
    (["oral hypoglycemic", "glimepiride", "metformin"],
                                           "Z79.84", "Long term use of oral hypoglycemic drugs",       0.89),
    (["insulin"],                          "Z79.4",  "Long-term (current) use of insulin",             0.91),
    (["anticoagulant", "warfarin"],        "Z79.01", "Long-term (current) use of anticoagulants",      0.90),
]

# CPT mini-dictionary
CPT_MAP: list[tuple[list[str], str, str, float]] = [
    (["hba1c", "glycated hemoglobin"],     "83036", "Hemoglobin; glycosylated (A1C)",                 0.97),
    (["fasting blood sugar", "glucose"],   "82947", "Glucose; quantitative, blood",                   0.95),
    (["lipid panel", "cholesterol"],       "80061", "Lipid panel",                                     0.93),
    (["complete blood count", "cbc"],      "85025", "Blood count; complete (CBC), automated",         0.96),
    (["thyroid", "tsh"],                   "84443", "Thyroid stimulating hormone (TSH)",               0.94),
    (["serum creatinine", "kidney"],       "82565", "Creatinine; blood",                               0.93),
    (["mri lumbar", "mri lumbosacral"],    "72148", "MRI lumbar spinal canal, without contrast",      0.95),
    (["mri brain"],                        "70553", "MRI brain with contrast",                         0.93),
    (["chest x-ray", "cxr"],              "71046", "Radiologic examination, chest; 2 views",          0.94),
    (["ecg", "electrocardiogram"],         "93000", "Electrocardiogram, routine",                      0.96),
    (["urine analysis", "urinalysis"],     "81003", "Urinalysis; automated, without microscopy",       0.92),
]

# LOINC mini-dictionary
LOINC_MAP: list[tuple[list[str], str, str, float]] = [
    (["hba1c", "a1c"],                    "4548-4",  "Hemoglobin A1c/Hemoglobin.total in Blood",      0.96),
    (["fasting glucose", "fasting blood sugar"], "1558-6", "Fasting glucose [Mass/volume] in Blood", 0.95),
    (["ldl"],                              "2089-1",  "LDL Cholesterol [Mass/volume] in Serum",       0.94),
    (["hdl"],                              "2085-9",  "HDL Cholesterol [Mass/volume] in Serum",       0.94),
    (["creatinine"],                       "2160-0",  "Creatinine [Mass/volume] in Serum",            0.93),
    (["tsh"],                              "3016-3",  "Thyrotropin [Units/volume] in Serum",          0.95),
    (["hemoglobin"],                       "718-7",   "Hemoglobin [Mass/volume] in Blood",            0.95),
    (["platelet"],                         "777-3",   "Platelets [#/volume] in Blood",                0.94),
    (["sodium"],                           "2951-2",  "Sodium [Moles/volume] in Serum",               0.93),
    (["potassium"],                        "2823-3",  "Potassium [Moles/volume] in Serum",            0.93),
]


def generate_codes(raw_text: str, diagnoses: list[str], lab_tests: list[str]) -> list[dict]:
    """
    Return a list of {system, code, description, confidence} dicts.
    """
    text_lower = raw_text.lower()
    all_lower = text_lower + " " + " ".join(d.lower() for d in diagnoses)
    results: list[dict] = []
    seen_codes: set[str] = set()

    def _add(system: str, code: str, desc: str, conf: float) -> None:
        if code not in seen_codes:
            seen_codes.add(code)
            results.append(
                {"system": system, "code": code, "description": desc, "confidence": round(conf, 2)}
            )

    for keywords, code, desc, conf in ICD10_MAP:
        if any(kw in all_lower for kw in keywords):
            _add("ICD-10", code, desc, conf)

    lab_lower = " ".join(t.lower() for t in lab_tests)
    for keywords, code, desc, conf in CPT_MAP:
        if any(kw in all_lower or kw in lab_lower for kw in keywords):
            _add("CPT", code, desc, conf)

    for keywords, code, desc, conf in LOINC_MAP:
        if any(kw in all_lower or kw in lab_lower for kw in keywords):
            _add("LOINC", code, desc, conf)

    return results

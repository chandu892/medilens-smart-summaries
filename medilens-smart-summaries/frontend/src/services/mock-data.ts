import type { AppNotification, HealthSnapshot, LabResult, PatientInfo, Report } from "./types";

export const MOCK_PATIENT: PatientInfo = {
  name: "Ravi Kumar",
  age: 52,
  gender: "Male",
  patientId: "MRN-204718",
};

export const MOCK_SNAPSHOT: HealthSnapshot = {
  conditions: ["Type 2 Diabetes Mellitus", "Hypertension", "Lumbar disc bulge (L4–L5)"],
  medications: ["Metformin 500 mg", "Glimepiride 1 mg", "Telmisartan 40 mg", "Pregabalin 75 mg"],
  allergies: ["Penicillin", "Sulfa drugs"],
};

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: "n1", title: "Summary ready", body: "Your HbA1c report from 8 Sep is summarized.", time: "2h ago", read: false },
  { id: "n2", title: "Improving trend", body: "HbA1c dropped from 8.9% to 7.1% since March.", time: "1d ago", read: false },
  { id: "n3", title: "Verification pending", body: "MRI Lumbar Spine is waiting for doctor review.", time: "3d ago", read: true },
];

const lab = (
  id: string,
  date: string,
  hba1c: string,
  fbs: string,
  ppbs: string,
  flagA: "high" | "normal",
  extra: LabResult[],
  overview: string,
  confidence: number,
): Report => ({
  id,
  title: `HbA1c & Blood Sugar Panel`,
  type: "lab",
  date,
  uploadedAt: `${date}T10:30:00Z`,
  status: "completed",
  facility: "Apollo Diagnostics, Hyderabad",
  doctor: "Dr. Anjali Mehta",
  fileName: `hba1c-${date}.pdf`,
  fileSize: 412_000,
  mime: "application/pdf",
  confidence,
  verified: id === "rep-hba1c-mar",
  patient: MOCK_PATIENT,
  summary: {
    overview,
    diagnosis: ["Type 2 Diabetes Mellitus", "Glycemic control " + (flagA === "high" ? "suboptimal" : "improving")],
    treatment: ["Continue oral hypoglycemics", "Low-carbohydrate diet, 30 min walk daily", "Repeat HbA1c in 3 months"],
    medications: [
      { name: "Metformin", dose: "500 mg", frequency: "Twice daily after meals", duration: "Ongoing" },
      { name: "Glimepiride", dose: "1 mg", frequency: "Once daily before breakfast", duration: "Ongoing" },
    ],
    labs: [
      { test: "HbA1c", value: hba1c, unit: "%", range: "4.0 – 5.6", flag: "high" },
      { test: "Fasting Blood Sugar", value: fbs, unit: "mg/dL", range: "70 – 100", flag: Number(fbs) > 100 ? "high" : "normal" },
      { test: "Post-prandial Blood Sugar", value: ppbs, unit: "mg/dL", range: "< 140", flag: Number(ppbs) >= 140 ? "high" : "normal" },
      ...extra,
    ],
  },
  extracted: [
    { label: "Patient", value: `${MOCK_PATIENT.name}, ${MOCK_PATIENT.age} y, ${MOCK_PATIENT.gender}` },
    { label: "Sample collected", value: date },
    { label: "HbA1c", value: `${hba1c} %` },
    { label: "Fasting glucose", value: `${fbs} mg/dL` },
    { label: "Post-prandial glucose", value: `${ppbs} mg/dL` },
    { label: "Referring doctor", value: "Dr. Anjali Mehta" },
  ],
  codes: [
    { system: "ICD-10", code: "E11.65", description: "Type 2 diabetes mellitus with hyperglycemia", confidence: 94 },
    { system: "CPT", code: "83036", description: "Hemoglobin; glycosylated (A1C)", confidence: 97 },
    { system: "CPT", code: "82947", description: "Glucose; quantitative, blood", confidence: 95 },
    { system: "LOINC", code: "4548-4", description: "Hemoglobin A1c/Hemoglobin.total in Blood", confidence: 96 },
  ],
  rawText: `APOLLO DIAGNOSTICS — HYDERABAD
LABORATORY REPORT

Patient: ${MOCK_PATIENT.name}     Age/Sex: ${MOCK_PATIENT.age}/M     MRN: ${MOCK_PATIENT.patientId}
Referred by: Dr. Anjali Mehta      Collected: ${date}

TEST                          RESULT      UNIT     REFERENCE
Glycated Hemoglobin (HbA1c)   ${hba1c.padEnd(10)}  %        4.0 - 5.6
Fasting Blood Sugar           ${fbs.padEnd(10)}  mg/dL    70 - 100
Post Prandial Blood Sugar     ${ppbs.padEnd(10)}  mg/dL    < 140
${extra.map((l) => `${l.test.padEnd(30)}${l.value.padEnd(12)}${l.unit.padEnd(9)}${l.range}`).join("\n")}

Method: HPLC (HbA1c), Hexokinase (Glucose)
-- End of report --`,
});

export const SEED_REPORTS: Report[] = [
  lab("rep-hba1c-sep", "2026-09-08", "7.1", "126", "172", "high",
    [{ test: "Serum Creatinine", value: "1.0", unit: "mg/dL", range: "0.7 – 1.3", flag: "normal" }],
    "HbA1c has improved to 7.1%, close to the usual target of below 7%. Fasting and post-meal sugars are still mildly raised. Kidney function is normal.",
    93),
  lab("rep-hba1c-jun", "2026-06-10", "7.8", "148", "210", "high",
    [{ test: "LDL Cholesterol", value: "118", unit: "mg/dL", range: "< 100", flag: "high" }],
    "HbA1c fell from 8.9% to 7.8%, showing better control after treatment changes. Sugars and LDL cholesterol remain above target.",
    91),
  lab("rep-hba1c-mar", "2026-03-12", "8.9", "182", "256", "high",
    [{ test: "Hemoglobin", value: "12.4", unit: "g/dL", range: "13.0 – 17.0", flag: "low" }],
    "HbA1c is 8.9%, well above target, indicating poorly controlled diabetes over the past 3 months. Mild anemia noted.",
    92),
  {
    id: "rep-rx-sep",
    title: "Prescription — Diabetes Follow-up",
    type: "prescription",
    date: "2026-09-10",
    uploadedAt: "2026-09-10T14:05:00Z",
    status: "completed",
    facility: "Sunrise Diabetes Clinic",
    doctor: "Dr. Anjali Mehta",
    fileName: "prescription-2026-09-10.jpg",
    fileSize: 1_240_000,
    mime: "image/jpeg",
    confidence: 88,
    verified: false,
    patient: MOCK_PATIENT,
    summary: {
      overview: "Follow-up prescription continuing diabetes and blood pressure medicines, with Pregabalin added for back pain radiating to the leg.",
      diagnosis: ["Type 2 Diabetes Mellitus — improving", "Essential hypertension", "Lumbar radiculopathy"],
      treatment: ["Continue current diabetes regimen", "Physiotherapy for lower back, 10 sessions", "Review in 3 months with HbA1c"],
      medications: [
        { name: "Metformin", dose: "500 mg", frequency: "1-0-1 after food", duration: "90 days" },
        { name: "Glimepiride", dose: "1 mg", frequency: "1-0-0 before breakfast", duration: "90 days" },
        { name: "Telmisartan", dose: "40 mg", frequency: "1-0-0", duration: "90 days" },
        { name: "Pregabalin", dose: "75 mg", frequency: "0-0-1 at bedtime", duration: "30 days" },
      ],
      labs: [],
    },
    extracted: [
      { label: "Prescriber", value: "Dr. Anjali Mehta, MD (Reg. TSMC-48213)" },
      { label: "Date", value: "2026-09-10" },
      { label: "BP recorded", value: "138/86 mmHg" },
      { label: "Weight", value: "81 kg" },
      { label: "Next visit", value: "2026-12-10" },
    ],
    codes: [
      { system: "ICD-10", code: "E11.9", description: "Type 2 diabetes mellitus without complications", confidence: 90 },
      { system: "ICD-10", code: "I10", description: "Essential (primary) hypertension", confidence: 93 },
      { system: "ICD-10", code: "M54.16", description: "Radiculopathy, lumbar region", confidence: 84 },
      { system: "ICD-10", code: "Z79.84", description: "Long term (current) use of oral hypoglycemic drugs", confidence: 89 },
    ],
    rawText: `SUNRISE DIABETES CLINIC
Dr. Anjali Mehta, MD (Internal Medicine) — Reg. TSMC-48213

Name: ${MOCK_PATIENT.name}   Age: 52   Date: 10/09/2026
BP: 138/86   Wt: 81 kg

Dx: T2DM (improving), HTN, Lumbar radiculopathy

Rx
1. Tab Metformin 500 mg      1-0-1  x 90 days
2. Tab Glimepiride 1 mg      1-0-0  x 90 days
3. Tab Telmisartan 40 mg     1-0-0  x 90 days
4. Cap Pregabalin 75 mg      0-0-1  x 30 days

Advice: Physiotherapy x10 sessions. Diet & walk.
Review after 3 months with HbA1c.`,
  },
  {
    id: "rep-mri-aug",
    title: "MRI Lumbar Spine",
    type: "radiology",
    date: "2026-08-20",
    uploadedAt: "2026-08-21T09:12:00Z",
    status: "completed",
    facility: "Vijaya Imaging Centre",
    doctor: "Dr. K. Srinivas (Radiologist)",
    fileName: "mri-lumbar-2026-08-20.pdf",
    fileSize: 2_860_000,
    mime: "application/pdf",
    confidence: 86,
    verified: false,
    patient: MOCK_PATIENT,
    summary: {
      overview: "MRI shows a diffuse disc bulge at L4–L5 pressing lightly on the left L5 nerve root, with early wear-and-tear changes. No fracture or serious spinal narrowing.",
      diagnosis: ["L4–L5 diffuse disc bulge with left L5 nerve root contact", "Early lumbar spondylosis"],
      treatment: ["Conservative management and physiotherapy", "Orthopedic / spine review if pain persists beyond 6 weeks"],
      medications: [],
      labs: [],
    },
    extracted: [
      { label: "Study", value: "MRI Lumbosacral spine, plain" },
      { label: "Sequences", value: "T1, T2 sagittal & axial, STIR" },
      { label: "Key finding", value: "L4–L5 diffuse disc bulge, left paracentral" },
      { label: "Canal", value: "Mild narrowing, no severe stenosis" },
      { label: "Impression", value: "Early degenerative changes" },
    ],
    codes: [
      { system: "ICD-10", code: "M51.26", description: "Other intervertebral disc displacement, lumbar region", confidence: 88 },
      { system: "ICD-10", code: "M47.816", description: "Spondylosis without myelopathy, lumbar region", confidence: 81 },
      { system: "CPT", code: "72148", description: "MRI lumbar spinal canal, without contrast", confidence: 95 },
    ],
    rawText: `VIJAYA IMAGING CENTRE
MRI LUMBOSACRAL SPINE (PLAIN)

Patient: ${MOCK_PATIENT.name}   52/M   Date: 20/08/2026

FINDINGS:
Normal lumbar lordosis. Vertebral body heights maintained.
L4-L5: Diffuse disc bulge with left paracentral protrusion
indenting thecal sac and contacting left traversing L5 root.
Mild canal narrowing. Facet arthropathy noted.
L5-S1: Mild disc desiccation, no neural compression.
Conus ends at L1, normal signal.

IMPRESSION:
1. L4-L5 disc bulge with left L5 nerve root contact.
2. Early lumbar spondylotic changes.

Dr. K. Srinivas, MD (Radiodiagnosis)`,
  },
  {
    id: "rep-consult-sep",
    title: "Consultation Note — Endocrinology",
    type: "consultation_note",
    date: "2026-09-28",
    uploadedAt: "2026-09-29T08:40:00Z",
    status: "analyzing",
    facility: "Sunrise Diabetes Clinic",
    doctor: "Dr. Anjali Mehta",
    fileName: "consult-2026-09-28.png",
    fileSize: 890_000,
    mime: "image/png",
    confidence: 0,
    verified: false,
    patient: MOCK_PATIENT,
    summary: null,
    extracted: [],
    codes: [],
    rawText: "Processing…",
  },
];

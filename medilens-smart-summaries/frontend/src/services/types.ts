// Shared data contracts. A FastAPI backend should return these same shapes
// so the mock services can be swapped without touching the UI.

export type ReportStatus = "uploaded" | "extracting" | "analyzing" | "completed" | "failed";

export type ReportType =
  | "lab"
  | "prescription"
  | "radiology"
  | "discharge_summary"
  | "consultation_note"
  | "follow_up";

export type LabFlag = "high" | "low" | "normal";

export interface PatientInfo {
  name: string;
  age: number;
  gender: string;
  patientId: string;
}

export interface Medication {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

export interface LabResult {
  test: string;
  value: string;
  unit: string;
  range: string;
  flag: LabFlag;
}

export interface MedicalCode {
  system: "ICD-10" | "CPT" | "LOINC" | "SNOMED CT";
  code: string;
  description: string;
  confidence: number;
}

export interface ReportSummary {
  overview: string;
  diagnosis: string[];
  treatment: string[];
  medications: Medication[];
  labs: LabResult[];
}

export interface Report {
  id: string;
  title: string;
  type: ReportType;
  date: string; // ISO date
  uploadedAt: string; // ISO datetime
  status: ReportStatus;
  facility: string;
  doctor: string;
  fileName: string;
  fileSize: number;
  mime: string;
  confidence: number; // 0-100
  verified: boolean;
  patient: PatientInfo;
  summary: ReportSummary | null;
  extracted: { label: string; value: string }[];
  codes: MedicalCode[];
  rawText: string;
}

export interface HealthSnapshot {
  conditions: string[];
  medications: string[];
  allergies: string[];
}

export interface DashboardStats {
  totalReports: number;
  summaries: number;
  processing: number;
  lastUpload: string | null;
  totalPatients?: number;
  pendingReview?: number;
  flaggedAbnormal?: number;
  verifiedReports?: number;
}

export interface ClinicalAlert {
  id: string;
  patientName: string;
  patientMrn: string;
  test: string;
  value: string;
  unit: string;
  range: string;
  flag: "high" | "low";
  reportId: string;
  reportTitle: string;
  date: string;
}

export interface DoctorPatientSummary {
  mrn: string;
  name: string;
  age: number;
  gender: string;
  diagnosis: string[];
  reportCount: number;
  unverifiedCount: number;
  hasAbnormalLabs: boolean;
  lastReportDate: string;
  lastReportId: string;
}

export interface DoctorOverview {
  stats: DashboardStats;
  patients: DoctorPatientSummary[];
  criticalAlerts: ClinicalAlert[];
  pendingReports: Report[];
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

export type PipelineStage = "uploaded" | "ocr" | "extraction" | "summary";

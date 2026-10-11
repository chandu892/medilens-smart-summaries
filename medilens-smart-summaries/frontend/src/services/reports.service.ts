import { apiFetch } from "./config";
import { apiUpload } from "@/lib/api";
import type {
  AppNotification,
  DashboardStats,
  DoctorOverview,
  HealthSnapshot,
  PipelineStage,
  Report,
  ReportType,
} from "./types";

// ---------------------------------------------------------------------------
// Report type helpers (unchanged — used by the Upload page dropdowns)
// ---------------------------------------------------------------------------
export const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "lab", label: "Lab Report" },
  { value: "prescription", label: "Prescription" },
  { value: "radiology", label: "Radiology" },
  { value: "discharge_summary", label: "Discharge Summary" },
  { value: "consultation_note", label: "Consultation Note" },
  { value: "follow_up", label: "Follow-up" },
];

export const reportTypeLabel = (t: ReportType) =>
  REPORT_TYPES.find((r) => r.value === t)?.label ?? t;

export const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png"];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

// ---------------------------------------------------------------------------
// API wrappers — all call the FastAPI backend
// ---------------------------------------------------------------------------

export async function listReports(): Promise<Report[]> {
  return apiFetch<Report[]>("/reports");
}

export async function getReport(id: string): Promise<Report | null> {
  try {
    return await apiFetch<Report>(`/reports/${id}`);
  } catch {
    return null;
  }
}

export async function deleteReport(id: string): Promise<void> {
  await apiFetch(`/reports/${id}`, { method: "DELETE" });
}

export async function markVerified(id: string): Promise<void> {
  await apiFetch(`/reports/${id}/verify`, { method: "POST" });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>("/dashboard/stats");
}

export async function getDoctorOverview(): Promise<DoctorOverview> {
  return apiFetch<DoctorOverview>("/doctor/overview");
}

export async function getHealthSnapshot(): Promise<HealthSnapshot> {
  return apiFetch<HealthSnapshot>("/patients/me/snapshot");
}

export async function getNotifications(): Promise<AppNotification[]> {
  return apiFetch<AppNotification[]>("/notifications");
}

/**
 * Upload a file to the backend pipeline.
 * The backend processes synchronously and returns the completed report.
 * We simulate progress ticks on the frontend while waiting.
 */
export async function uploadReport(
  file: File,
  type: ReportType,
  cb: { onProgress: (pct: number) => void; onStage: (stage: PipelineStage) => void },
): Promise<Report> {
  // Simulate upload progress while file is being sent
  cb.onProgress(10);
  cb.onStage("uploaded");

  const form = new FormData();
  form.append("file", file);
  form.append("report_type", type);

  // Fake progress ticks while we wait for the backend
  let pct = 15;
  const ticker = setInterval(() => {
    if (pct < 85) {
      pct += 5;
      cb.onProgress(pct);
    }
  }, 600);

  cb.onStage("ocr");

  try {
    const report = await apiUpload<Report>("/reports/upload", form);
    clearInterval(ticker);
    cb.onProgress(100);
    cb.onStage("summary");
    return report;
  } catch (err) {
    clearInterval(ticker);
    throw err;
  }
}

export async function askAssistant(question: string, reportId?: string): Promise<string> {
  const r = await apiFetch<{ answer: string }>("/assistant", {
    method: "POST",
    body: JSON.stringify({ question, reportId }),
  });
  return r.answer;
}

/** Download the original file URL (served by backend /api/reports/{id}/download) */
export function getOriginalFileUrl(id: string): string {
  const base =
    (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "http://localhost:8000/api";
  return `${base}/reports/${id}/download`;
}

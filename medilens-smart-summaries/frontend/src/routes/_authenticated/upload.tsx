import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, FileUp, Loader2, UploadCloud, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACCEPTED_MIME,
  MAX_FILE_BYTES,
  REPORT_TYPES,
  uploadReport,
} from "@/services/reports.service";
import type { PipelineStage, ReportType } from "@/services/types";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({ meta: [{ title: "Upload Report — MediLens" }] }),
  component: UploadPage,
});

const STAGE_LABELS: Record<PipelineStage, string> = {
  uploaded: "Uploading file…",
  ocr: "Extracting text (OCR)…",
  extraction: "Analysing medical data…",
  summary: "Generating AI summary…",
};

const STAGES: PipelineStage[] = ["uploaded", "ocr", "extraction", "summary"];

function UploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState<ReportType>("lab");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<PipelineStage | null>(null);
  const [error, setError] = useState<string | null>(null);

  function validateFile(f: File): string | null {
    if (!ACCEPTED_MIME.includes(f.type)) return "Only PDF, JPEG and PNG files are accepted.";
    if (f.size > MAX_FILE_BYTES) return "File must be under 10 MB.";
    return null;
  }

  function pickFile(f: File) {
    const err = validateFile(f);
    if (err) { toast.error(err); return; }
    setFile(f);
    setError(null);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }

  async function submit() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setProgress(0);
    setStage("uploaded");

    try {
      const report = await uploadReport(file, reportType, {
        onProgress: setProgress,
        onStage: setStage,
      });
      toast.success("Report processed successfully!");
      navigate({ to: "/reports/$id", params: { id: report.id } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppShell title="Upload Report">
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Upload a medical document</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            PDF, JPEG or PNG · max 10 MB · the original is never modified
          </p>
        </div>

        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-colors ${
            dragging
              ? "border-primary bg-primary/5"
              : file
              ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10"
              : "border-border bg-card hover:border-primary/50"
          }`}
        >
          {file ? (
            <>
              <CheckCircle2 className="size-10 text-emerald-500" />
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(0)} KB
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
              >
                Remove
              </Button>
            </>
          ) : (
            <>
              <UploadCloud className="size-10 text-muted-foreground" />
              <p className="text-sm font-medium">
                Click or drag a file here
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, JPEG or PNG — up to 10 MB
              </p>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
        />

        {/* Report type */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Document type</label>
          <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
            <SelectTrigger className="!h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pipeline stepper */}
        {uploading && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="size-4 animate-spin text-primary" />
              {stage ? STAGE_LABELS[stage] : "Starting…"}
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Stage indicators */}
            <ol className="flex gap-2">
              {STAGES.map((s, i) => {
                const currentIdx = stage ? STAGES.indexOf(stage) : -1;
                const done = i < currentIdx;
                const active = i === currentIdx;
                return (
                  <li
                    key={s}
                    className={`flex-1 rounded-lg px-2 py-1 text-center text-xs font-medium transition-colors ${
                      done
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : active
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {s}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            <XCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        )}

        <Button
          className="h-11 w-full rounded-xl"
          disabled={!file || uploading}
          onClick={submit}
        >
          {uploading ? (
            <><Loader2 className="mr-2 size-4 animate-spin" /> Processing…</>
          ) : (
            <><FileUp className="mr-2 size-4" /> Upload & Analyse</>
          )}
        </Button>
      </div>
    </AppShell>
  );
}

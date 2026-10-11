import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  FileText,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listReports, deleteReport, markVerified, reportTypeLabel } from "@/services/reports.service";
import type { Report, ReportStatus, ReportType } from "@/services/types";

import { useAuthUser } from "@/lib/auth-store";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — MediLens" }] }),
  component: ReportsPage,
});

const STATUS_STYLES: Record<ReportStatus, string> = {
  uploaded:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  extracting: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  analyzing:  "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  completed:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  failed:     "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function ReportsPage() {
  const qc = useQueryClient();
  const user = useAuthUser();
  const isDoctor = user?.role === "doctor" || user?.role === "specialist";
  const [search, setSearch] = useState("");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: listReports,
    retry: 1,
  });

  const deleteMut = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Report deleted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyMut = useMutation({
    mutationFn: markVerified,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Report verified and signed off.");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to verify report."),
  });

  const filtered = reports.filter((r) => {
    const q = search.toLowerCase();
    const pName = (r.patient?.name || "").toLowerCase();
    const mrn = (r.patient?.patientId || "").toLowerCase();
    const diags = (r.summary?.diagnosis || []).join(" ").toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.facility.toLowerCase().includes(q) ||
      r.doctor.toLowerCase().includes(q) ||
      pName.includes(q) ||
      mrn.includes(q) ||
      diags.includes(q)
    );
  });

  return (
    <AppShell title={isDoctor ? "Patient Records" : "My Reports"}>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">
              {isDoctor ? "Patient Records & Clinical Queue" : "My Reports"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isDoctor
                ? "Review, verify, and monitor diagnostic records across patients."
                : "Your personal medical records and AI-generated summaries."}
            </p>
          </div>
          <Button asChild className="rounded-xl">
            <Link to="/upload">Upload new</Link>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search reports…"
            className="pl-9 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading && (
          <div className="py-12 text-center text-muted-foreground">Loading reports…</div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-3 size-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {reports.length === 0
                ? "No reports yet. Upload your first document."
                : "No reports match your search."}
            </p>
            {reports.length === 0 && (
              <Button asChild className="mt-4 rounded-xl">
                <Link to="/upload">Upload a report</Link>
              </Button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((r) => (
            <ReportRow
              key={r.id}
              report={r}
              isDoctor={isDoctor}
              onDelete={() => deleteMut.mutate(r.id)}
              onVerify={() => verifyMut.mutate(r.id)}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function ReportRow({
  report: r,
  isDoctor,
  onDelete,
  onVerify,
}: {
  report: Report;
  isDoctor: boolean;
  onDelete: () => void;
  onVerify: () => void;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-card hover:shadow-glow transition-shadow">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <FileText className="size-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {isDoctor && r.patient?.name && (
            <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              {r.patient.name}
              {r.patient.patientId ? ` (${r.patient.patientId})` : ""}
            </span>
          )}
          <Link
            to="/reports/$id"
            params={{ id: r.id }}
            className="font-semibold hover:text-primary transition-colors truncate"
          >
            {r.title}
          </Link>
          {r.verified && (
            <BadgeCheck className="size-4 text-emerald-500 shrink-0" />
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              STATUS_STYLES[r.status as ReportStatus] ?? ""
            }`}
          >
            {r.status}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span>{reportTypeLabel(r.type as ReportType)}</span>
          <span>{r.date}</span>
          {r.facility && <span>{r.facility}</span>}
          {r.doctor && <span>{r.doctor}</span>}
        </div>
        {r.summary?.diagnosis && r.summary.diagnosis.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {r.summary.diagnosis.slice(0, 3).map((d) => (
              <span key={d} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {d}
              </span>
            ))}
          </div>
        )}
        {r.confidence > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="h-1.5 w-24 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${r.confidence}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{r.confidence.toFixed(0)}% confidence</span>
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {isDoctor && !r.verified && (
          <Button
            size="sm"
            onClick={onVerify}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-3"
          >
            <BadgeCheck className="mr-1 size-3.5" /> Sign Off
          </Button>
        )}
        <Button asChild variant="outline" size="sm" className="rounded-xl h-9">
          <Link to="/reports/$id" params={{ id: r.id }}>
            View
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl text-destructive hover:bg-destructive/10 h-9 w-9"
          onClick={onDelete}
          aria-label="Delete report"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

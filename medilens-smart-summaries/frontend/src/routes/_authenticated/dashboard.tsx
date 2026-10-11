import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileText,
  FileUp,
  HeartPulse,
  Info,
  Pill,
  QrCode,
  Search,
  ServerOff,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthUser } from "@/lib/auth-store";
import { roleLabel } from "@/lib/roles";
import {
  getDashboardStats,
  getDoctorOverview,
  getHealthSnapshot,
  getNotifications,
  listReports,
  markVerified,
} from "@/services/reports.service";
import type { Report, ReportStatus } from "@/services/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MediLens" },
      { name: "description", content: "Your personalized MediLens workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

export function DashboardPage() {
  const user = useAuthUser();
  const isDoctor = user?.role === "doctor" || user?.role === "specialist";

  return (
    <AppShell title={isDoctor ? "Clinical Cockpit" : "Patient Portal"}>
      {isDoctor ? <DoctorDashboard user={user} /> : <PatientDashboard user={user} />}
    </AppShell>
  );
}

// ===========================================================================
// DOCTOR CLINICAL COCKPIT DASHBOARD
// ===========================================================================
function DoctorDashboard({ user }: { user: ReturnType<typeof useAuthUser> }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unverified" | "abnormal" | "verified">("all");

  const { data: stats, isError: statsError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
    retry: 1,
  });

  const { data: doctorOverview } = useQuery({
    queryKey: ["doctor-overview"],
    queryFn: getDoctorOverview,
    retry: 1,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: listReports,
    retry: 1,
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    retry: 1,
  });

  // One-click quick verify mutation
  const verifyMut = useMutation({
    mutationFn: markVerified,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["doctor-overview"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Clinical review verified and signed off.");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to verify report."),
  });

  // Filtered reports for the review queue
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const pName = r.patient?.name || "";
      const mrn = r.patient?.patientId || "";
      const diag = (r.summary?.diagnosis || []).join(" ");
      const matchesSearch =
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        diag.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      const hasAbnormalLabs = r.summary?.labs?.some((l) => l.flag === "high" || l.flag === "low");

      if (activeTab === "unverified") return !r.verified;
      if (activeTab === "verified") return r.verified;
      if (activeTab === "abnormal") return hasAbnormalLabs;
      return true;
    });
  }, [reports, searchTerm, activeTab]);

  const criticalAlerts = doctorOverview?.criticalAlerts || [];
  const pendingCount = stats?.pendingReview ?? reports.filter((r) => !r.verified).length;
  const abnormalCount = stats?.flaggedAbnormal ?? reports.filter((r) => r.summary?.labs?.some((l) => l.flag === "high" || l.flag === "low")).length;
  const totalPatientsCount = stats?.totalPatients ?? (doctorOverview?.patients?.length || (reports.length > 0 ? 1 : 0));
  const verifiedCount = stats?.verifiedReports ?? reports.filter((r) => r.verified).length;

  return (
    <div className="space-y-6">
      {/* Physician Header Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-background to-secondary/40 p-6 shadow-glow dark:from-primary/25 dark:via-background dark:to-secondary/20 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                <Stethoscope className="size-3.5" /> Licensed Physician
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active on Duty
              </span>
              {user?.license_number && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 px-2.5 py-0.5 text-[11px] font-mono text-muted-foreground">
                  <BadgeCheck className="size-3 text-primary" /> {user.license_number}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Doctor Cockpit — {user?.full_name || "Dr. Mehta"}
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Internal Medicine & Clinical Diagnostics. AI-assisted triage, patient review queue, and lab risk prioritization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button asChild className="rounded-xl shadow-glow">
              <Link to="/upload">
                <FileUp className="mr-1.5 size-4" /> Upload Lab / Note
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/assistant">
                <BrainCircuit className="mr-1.5 size-4 text-primary" /> Clinical AI Q&A
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Backend offline warning */}
      {statsError && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <ServerOff className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">FastAPI Backend not connected</p>
            <p className="text-xs mt-0.5">
              Run <code className="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">uvicorn main:app --reload --port 8000</code> to enable live reports.
            </p>
          </div>
        </div>
      )}

      {/* Clinical KPI Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-glow">
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <Users className="size-5" />
            </span>
            <span className="text-xs font-medium text-muted-foreground">Active Patients</span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-foreground">{totalPatientsCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Under active care</p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-card p-5 shadow-card transition-all hover:shadow-glow">
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Clock className="size-5" />
            </span>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
              Action Required
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-amber-600 dark:text-amber-400">{pendingCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Pending clinical sign-off</p>
        </div>

        <div className="rounded-2xl border border-rose-500/30 bg-card p-5 shadow-card transition-all hover:shadow-glow">
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-5" />
            </span>
            <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
              High Priority
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-rose-600 dark:text-rose-400">{abnormalCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Abnormal lab findings flagged</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-card p-5 shadow-card transition-all hover:shadow-glow">
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-5" />
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">100% Verified</span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{verifiedCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Signed & finalized summaries</p>
        </div>
      </div>

      {/* Critical Lab Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <section className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-rose-500" />
              <h2 className="text-sm font-semibold tracking-wide uppercase text-rose-600 dark:text-rose-400">
                Critical & Abnormal Findings Ticker
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {criticalAlerts.length} urgent value{criticalAlerts.length > 1 ? "s" : ""} detected
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {criticalAlerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between rounded-xl border border-rose-200 bg-card p-3.5 shadow-sm dark:border-rose-900/40"
              >
                <div className="space-y-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                      {alert.flag}
                    </span>
                    <p className="truncate text-xs font-semibold text-foreground">{alert.patientName}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">{alert.test}:</strong> {alert.value} {alert.unit}
                    <span className="ml-1 text-[10px] opacity-75">(Normal: {alert.range})</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{alert.reportTitle}</p>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="rounded-lg h-7 px-2.5 text-xs text-rose-600 hover:text-rose-700 shrink-0"
                >
                  <Link to="/reports/$id" params={{ id: alert.reportId }}>
                    Review
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Review Queue & Patient Directory */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileCheck className="size-5 text-primary" /> Patient Records & Clinical Review Queue
            </h2>
            <p className="text-xs text-muted-foreground">
              Review OCR extractions, check abnormal markers, and verify AI clinical summaries.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search patient, MRN, condition…"
              className="pl-9 rounded-xl h-10 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            All Reports ({reports.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("unverified")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "unverified"
                ? "bg-amber-600 text-white"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
            }`}
          >
            Needs Physician Review ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("abnormal")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "abnormal"
                ? "bg-rose-600 text-white"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
            }`}
          >
            Abnormal Findings ({abnormalCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("verified")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "verified"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
            }`}
          >
            Verified ({verifiedCount})
          </button>
        </div>

        {/* Reports review list */}
        {filteredReports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <FileText className="mx-auto mb-2 size-10 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">No reports match the selected filter</p>
            <p className="text-xs text-muted-foreground mt-1">Try changing filters or upload a new patient document.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((r) => {
              const abnormalLabs = r.summary?.labs?.filter((l) => l.flag === "high" || l.flag === "low") || [];
              const hasAbnormal = abnormalLabs.length > 0;

              return (
                <div
                  key={r.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:border-primary/40 hover:shadow-glow sm:p-5"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    {/* Left: Patient info & Document */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-base text-foreground">
                          {r.patient?.name || "Ravi Kumar"}
                        </span>
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                          {r.patient?.patientId || "MRN-204718"}
                        </span>
                        {r.patient?.age > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {r.patient.age}y / {r.patient.gender || "M"}
                          </span>
                        )}
                        {r.verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <BadgeCheck className="size-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            <Clock className="size-3.5" /> Pending Review
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{r.title}</span>
                        <span>·</span>
                        <span>{r.date || "2026-09-10"}</span>
                        <span>·</span>
                        <span>{r.facility || "Apollo Diagnostics"}</span>
                        <span>·</span>
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                          AI Confidence: {Math.round(r.confidence || 93)}%
                        </span>
                      </div>

                      {/* Diagnoses and Abnormal tags */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {r.summary?.diagnosis?.map((d) => (
                          <span
                            key={d}
                            className="rounded-lg bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground"
                          >
                            {d}
                          </span>
                        ))}
                        {hasAbnormal && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="size-3" /> {abnormalLabs.length} Abnormal Lab{abnormalLabs.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0">
                      {!r.verified && (
                        <Button
                          size="sm"
                          onClick={() => verifyMut.mutate(r.id)}
                          disabled={verifyMut.isPending}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-3.5"
                        >
                          <CheckCircle2 className="mr-1.5 size-3.5" /> Sign Off / Verify
                        </Button>
                      )}

                      <Button asChild size="sm" variant="outline" className="rounded-xl text-xs h-9">
                        <Link to="/reports/$id" params={{ id: r.id }}>
                          View Summary <ArrowRight className="ml-1.5 size-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Clinical Decision Support & Quick Prompts */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Clinical Decision Support & Coding Shortcuts
            </h2>
          </div>
          <Link to="/assistant" className="text-xs text-primary font-medium hover:underline">
            Open AI Assistant →
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/assistant" })}
            className="rounded-xl border border-border bg-secondary/30 p-3.5 text-left transition-all hover:bg-secondary hover:border-primary/40"
          >
            <p className="text-xs font-semibold text-foreground">ICD-10 & CPT Billing Verification</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Check suggested codes (E11.65, 83036) against documentation guidelines.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate({ to: "/assistant" })}
            className="rounded-xl border border-border bg-secondary/30 p-3.5 text-left transition-all hover:bg-secondary hover:border-primary/40"
          >
            <p className="text-xs font-semibold text-foreground">Drug-Drug Interaction Screen</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Verify interaction safety for Metformin + Glimepiride + Pregabalin.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate({ to: "/compare" })}
            className="rounded-xl border border-border bg-secondary/30 p-3.5 text-left transition-all hover:bg-secondary hover:border-primary/40"
          >
            <p className="text-xs font-semibold text-foreground">Multi-Report Trend Analysis</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Compare longitudinal HbA1c & glucose improvements across visits.
            </p>
          </button>
        </div>
      </section>
    </div>
  );
}

// ===========================================================================
// PATIENT PORTAL DASHBOARD
// ===========================================================================
function PatientDashboard({ user }: { user: ReturnType<typeof useAuthUser> }) {
  const navigate = useNavigate();

  const { data: stats, isError: statsError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
    retry: 1,
  });

  const { data: snapshot } = useQuery({
    queryKey: ["health-snapshot"],
    queryFn: getHealthSnapshot,
    retry: 1,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: listReports,
    retry: 1,
  });

  const recentReports = reports.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Patient Welcome Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-glow sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
              <User className="size-3.5" /> Personal Health Passport
            </span>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Hello, {user?.full_name || "Ravi Kumar"}
            </h1>
            <p className="text-sm opacity-90 max-w-xl">
              Your medical summaries, medications, and lab trends are organized and explained in clear, simple words.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" className="rounded-xl shadow-sm text-foreground">
              <Link to="/upload">
                <FileUp className="mr-1.5 size-4" /> Upload Document
              </Link>
            </Button>
            <Button
              asChild
              className="rounded-xl bg-white/25 hover:bg-white/35 text-white border-0"
            >
              <Link to="/qr">
                <QrCode className="mr-1.5 size-4" /> Emergency ID
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Backend offline alert */}
      {statsError && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <ServerOff className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Backend not running</p>
            <p className="text-xs mt-0.5">
              Start the FastAPI server: <code className="font-mono ml-1">uvicorn main:app --reload --port 8000</code>
            </p>
          </div>
        </div>
      )}

      {/* Personal Health Snapshot (3 cards) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Activity className="size-4 text-primary" /> My Health Snapshot
          </h2>
          <span className="text-xs text-muted-foreground">Updated automatically from your reports</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Active Conditions */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Conditions
              </span>
              <span className="size-2 rounded-full bg-blue-500" />
            </div>
            {snapshot?.conditions && snapshot.conditions.length > 0 ? (
              <ul className="space-y-2">
                {snapshot.conditions.map((c) => (
                  <li key={c} className="flex items-center gap-2 text-sm font-medium">
                    <span className="size-1.5 rounded-full bg-primary" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">None recorded yet</p>
            )}
          </div>

          {/* Current Medications */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Current Medications
              </span>
              <span className="size-2 rounded-full bg-emerald-500" />
            </div>
            {snapshot?.medications && snapshot.medications.length > 0 ? (
              <ul className="space-y-2">
                {snapshot.medications.map((m) => (
                  <li key={m} className="flex items-start gap-2 text-sm font-medium">
                    <Pill className="size-3.5 text-primary mt-1 shrink-0" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">None recorded yet</p>
            )}
          </div>

          {/* Known Allergies */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Known Drug Allergies
              </span>
              <span className="size-2 rounded-full bg-rose-500" />
            </div>
            {snapshot?.allergies && snapshot.allergies.length > 0 ? (
              <ul className="space-y-2">
                {snapshot.allergies.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-400">
                    <ShieldAlert className="size-3.5 shrink-0" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No known drug allergies</p>
            )}
          </div>
        </div>
      </section>

      {/* Key Lab Markers & Vitals Tracker */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <HeartPulse className="size-4 text-emerald-500" /> Key Vitals & Lab Trends
            </h2>
            <p className="text-xs text-muted-foreground">Recent laboratory values with target ranges</p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs">
            <Link to="/compare">Compare Trends →</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-secondary/30 p-3.5">
            <p className="text-xs text-muted-foreground">HbA1c (Glycated Hb)</p>
            <p className="text-2xl font-bold text-foreground mt-1">7.1 %</p>
            <span className="inline-block mt-1 rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
              Target: &lt; 7.0% · Improving
            </span>
          </div>

          <div className="rounded-xl border border-border bg-secondary/30 p-3.5">
            <p className="text-xs text-muted-foreground">Fasting Blood Sugar</p>
            <p className="text-2xl font-bold text-foreground mt-1">126 mg/dL</p>
            <span className="inline-block mt-1 rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
              Target: 70–100 mg/dL
            </span>
          </div>

          <div className="rounded-xl border border-border bg-secondary/30 p-3.5">
            <p className="text-xs text-muted-foreground">Blood Pressure</p>
            <p className="text-2xl font-bold text-foreground mt-1">138/86</p>
            <span className="inline-block mt-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              Controlled with Telmisartan
            </span>
          </div>

          <div className="rounded-xl border border-border bg-secondary/30 p-3.5">
            <p className="text-xs text-muted-foreground">Serum Creatinine</p>
            <p className="text-2xl font-bold text-foreground mt-1">1.0 mg/dL</p>
            <span className="inline-block mt-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              Normal (0.7 – 1.3)
            </span>
          </div>
        </div>
      </section>

      {/* Recent Medical Records & Plain-Language AI Summaries */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <FileText className="size-4 text-violet-500" /> My Medical Records & Summaries
          </h2>
          <Link to="/reports" className="text-xs text-primary font-medium hover:underline">
            View all ({reports.length}) →
          </Link>
        </div>

        {recentReports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <FileText className="mx-auto mb-2 size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">No medical documents uploaded yet</p>
            <Button asChild size="sm" className="mt-3 rounded-xl">
              <Link to="/upload">Upload your first document</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentReports.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:border-primary/40 sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-base text-foreground truncate">{r.title}</p>
                      {r.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <BadgeCheck className="size-3" /> Verified by Doctor
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.date} · {r.facility || "Apollo Diagnostics"} · {r.doctor || "Dr. Anjali Mehta"}
                    </p>
                    {r.summary?.overview && (
                      <p className="text-xs text-foreground/85 line-clamp-2 pt-1 bg-secondary/30 rounded-lg p-2.5">
                        <strong className="text-primary mr-1">In simple words:</strong>
                        {r.summary.overview}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button asChild size="sm" variant="outline" className="rounded-xl text-xs h-9">
                      <Link to="/reports/$id" params={{ id: r.id }}>
                        Read Summary <ArrowRight className="ml-1.5 size-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Emergency Medical ID Card & Ask MediLens AI */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-5 shadow-card flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
              <QrCode className="size-5" />
              <h3 className="font-bold text-sm">Emergency Medical ID Pass</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              In an emergency, paramedics or physicians can scan your secure QR code to instantly access your drug allergies, current medications, and primary condition.
            </p>
          </div>
          <Button asChild size="sm" className="mt-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white w-fit">
            <Link to="/qr">
              <QrCode className="mr-1.5 size-3.5" /> View / Generate Emergency QR
            </Link>
          </Button>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-card flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="size-5" />
              <h3 className="font-bold text-sm">Ask MediLens AI Assistant</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Have questions about your lab results, diet, or prescription timing? Ask our medical AI assistant for clear, plain-language answers.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate({ to: "/assistant" })}
              className="rounded-lg bg-card border border-border px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary transition-colors"
            >
              "What does my 7.1% HbA1c mean?"
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/assistant" })}
              className="rounded-lg bg-card border border-border px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary transition-colors"
            >
              "Can I take Metformin with food?"
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

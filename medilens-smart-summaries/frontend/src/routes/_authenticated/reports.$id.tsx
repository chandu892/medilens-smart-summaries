import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Bot,
  Download,
  Loader2,
  Send,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getReport, markVerified, getOriginalFileUrl, listReports, askAssistant } from "@/services/reports.service";
import type { LabFlag, MedicalCode, Report } from "@/services/types";
import { useAuthUser } from "@/lib/auth-store";

export const Route = createFileRoute("/_authenticated/reports/$id")({
  head: () => ({ meta: [{ title: "Report Detail — MediLens" }] }),
  component: ReportDetailPage,
});

const FLAG_STYLES: Record<LabFlag, string> = {
  high:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  low:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  normal: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

// Build trend data from all lab reports for a given test name
function buildTrendData(reports: Report[], testName: string) {
  const points: { date: string; value: number }[] = [];
  for (const r of [...reports].sort((a, b) => a.date.localeCompare(b.date))) {
    const lab = r.summary?.labs.find(
      (l) => l.test.toLowerCase().includes(testName.toLowerCase()),
    );
    if (lab) {
      const v = parseFloat(lab.value);
      if (!isNaN(v)) points.push({ date: r.date, value: v });
    }
  }
  return points;
}

function ReportDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const user = useAuthUser();
  const [quickQ, setQuickQ] = useState("");
  const [quickA, setQuickA] = useState<string | null>(null);
  const [askingQ, setAskingQ] = useState(false);

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ["report", id],
    queryFn: () => getReport(id),
    retry: 1,
  });

  const { data: allReports = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: listReports,
    retry: 1,
  });

  const verifyMut = useMutation({
    mutationFn: () => markVerified(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report", id] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Report marked as verified.");
    },
  });

  async function askQuickQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!quickQ.trim()) return;
    setAskingQ(true);
    setQuickA(null);
    try {
      const answer = await askAssistant(quickQ, id);
      setQuickA(answer);
    } catch {
      setQuickA("Could not connect to the assistant. Start the backend to enable Q&A.");
    } finally {
      setAskingQ(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell title="Report">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (isError || !report) {
    return (
      <AppShell title="Report">
        <div className="flex flex-col items-center gap-4 py-20">
          <AlertTriangle className="size-10 text-destructive" />
          <p className="text-muted-foreground">Report not found or could not be loaded.</p>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/reports"><ArrowLeft className="mr-1.5 size-4" /> Back to reports</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const downloadUrl = getOriginalFileUrl(report.id);
  const isDoctor = user?.role === "doctor" || user?.role === "specialist";

  // Build lab trend charts for any repeated tests
  const labTests = report.summary?.labs.map((l) => l.test) ?? [];
  const trendableTests = labTests.filter((t) => buildTrendData(allReports, t).length > 1);

  return (
    <AppShell title={report.title}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 rounded-xl">
              <Link to="/reports"><ArrowLeft className="mr-1 size-3.5" /> All reports</Link>
            </Button>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold leading-tight">{report.title}</h1>
              {report.patient?.name && (
                <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {report.patient.name}
                  {report.patient.patientId ? ` · ${report.patient.patientId}` : ""}
                  {report.patient.age ? ` (${report.patient.age}y)` : ""}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {report.date}
              {report.facility ? ` · ${report.facility}` : ""}
              {report.doctor ? ` · ${report.doctor}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!report.verified && report.status === "completed" && (
              <Button
                size="sm"
                className="rounded-xl"
                disabled={verifyMut.isPending}
                onClick={() => verifyMut.mutate()}
              >
                <BadgeCheck className="mr-1.5 size-4" />
                Mark verified
              </Button>
            )}
            {report.verified && (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-400 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                <BadgeCheck className="size-3.5" /> Verified
              </span>
            )}
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <a href={downloadUrl} target="_blank" rel="noreferrer">
                <Download className="mr-1.5 size-4" /> Download original
              </a>
            </Button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          AI-generated summary for informational purposes only. Always verify against the original document before any clinical decision. The original file is always available above.
        </div>

        {/* Tabs */}
        <Tabs defaultValue="summary">
          <TabsList className="rounded-xl flex-wrap h-auto gap-1">
            <TabsTrigger value="summary">AI Summary</TabsTrigger>
            <TabsTrigger value="extracted">Extracted Info</TabsTrigger>
            <TabsTrigger value="codes">Medical Codes</TabsTrigger>
            {trendableTests.length > 0 && (
              <TabsTrigger value="trends">Lab Trends</TabsTrigger>
            )}
            <TabsTrigger value="ask">Ask About This</TabsTrigger>
            <TabsTrigger value="raw">Original Text</TabsTrigger>
          </TabsList>

          {/* ── AI Summary ── */}
          <TabsContent value="summary" className="mt-4 space-y-5">
            {!report.summary ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8">
                <Loader2 className="size-5 animate-spin" />
                Summary is being generated…
              </div>
            ) : (
              <>
                {/* Role-aware header */}
                {isDoctor && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-xs text-primary font-medium">
                    Clinical view — showing full detail for {user?.role} role
                  </div>
                )}

                <Section title="Overview">
                  <p className="text-sm leading-relaxed">{report.summary.overview}</p>
                </Section>

                {report.summary.diagnosis.length > 0 && (
                  <Section title="Diagnoses">
                    <ul className="space-y-1.5">
                      {report.summary.diagnosis.map((d) => (
                        <li key={d} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {report.summary.medications.length > 0 && (
                  <Section title="Medications">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs text-muted-foreground">
                            <th className="pb-2 pr-4 font-medium">Name</th>
                            <th className="pb-2 pr-4 font-medium">Dose</th>
                            <th className="pb-2 pr-4 font-medium">Frequency</th>
                            <th className="pb-2 font-medium">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {report.summary.medications.map((m, i) => (
                            <tr key={i}>
                              <td className="py-2 pr-4 font-medium">{m.name}</td>
                              <td className="py-2 pr-4">{m.dose || "—"}</td>
                              <td className="py-2 pr-4">{m.frequency || "—"}</td>
                              <td className="py-2">{m.duration || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Section>
                )}

                {report.summary.labs.length > 0 && (
                  <Section title="Lab Results">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs text-muted-foreground">
                            <th className="pb-2 pr-4 font-medium">Test</th>
                            <th className="pb-2 pr-4 font-medium">Value</th>
                            <th className="pb-2 pr-4 font-medium">Unit</th>
                            <th className="pb-2 pr-4 font-medium">Ref. Range</th>
                            <th className="pb-2 font-medium">Flag</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {report.summary.labs.map((l, i) => (
                            <tr key={i} className={l.flag !== "normal" ? "bg-red-50/50 dark:bg-red-900/5" : ""}>
                              <td className="py-2 pr-4 font-medium">{l.test}</td>
                              <td className={`py-2 pr-4 font-semibold ${l.flag === "high" ? "text-red-600" : l.flag === "low" ? "text-blue-600" : ""}`}>
                                {l.value}
                              </td>
                              <td className="py-2 pr-4 text-muted-foreground">{l.unit}</td>
                              <td className="py-2 pr-4 text-muted-foreground">{l.range}</td>
                              <td className="py-2">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${FLAG_STYLES[l.flag as LabFlag]}`}>
                                  {l.flag.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Highlight abnormal */}
                    {report.summary.labs.filter((l) => l.flag !== "normal").length > 0 && (
                      <div className="mt-3 rounded-lg bg-red-50 dark:bg-red-900/10 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                        ⚠ {report.summary.labs.filter((l) => l.flag !== "normal").length} abnormal value(s) detected — highlighted above
                      </div>
                    )}
                  </Section>
                )}

                {report.summary.treatment.length > 0 && (
                  <Section title="Treatment & Follow-up">
                    <ul className="space-y-1.5">
                      {report.summary.treatment.map((t) => (
                        <li key={t} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {/* Confidence */}
                {report.confidence > 0 && (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">AI confidence score</p>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${report.confidence}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-primary">{report.confidence.toFixed(0)}%</span>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Extracted Info ── */}
          <TabsContent value="extracted" className="mt-4">
            {report.extracted.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>No extracted fields available.</p>
                <p className="mt-1 text-xs">Start the backend and re-upload the document to extract data.</p>
              </div>
            ) : (
              <>
                <p className="mb-4 text-xs text-muted-foreground">
                  Structured data extracted from the document text. Verify each field against the original.
                </p>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {report.extracted.map((f) => (
                    <div key={f.label} className="rounded-xl border border-border bg-card p-3">
                      <dt className="text-xs text-muted-foreground">{f.label}</dt>
                      <dd className="mt-0.5 text-sm font-medium">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </TabsContent>

          {/* ── Medical Codes ── */}
          <TabsContent value="codes" className="mt-4">
            {report.codes.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>No medical codes generated.</p>
                <p className="mt-1 text-xs">Codes are generated automatically by the backend pipeline.</p>
              </div>
            ) : (
              <>
                <p className="mb-4 text-xs text-muted-foreground">
                  Auto-generated ICD-10, CPT and LOINC codes. Confidence score shown for each. Always verify before use in billing or claims.
                </p>
                <div className="space-y-2">
                  {["ICD-10", "CPT", "LOINC", "SNOMED CT"].map((sys) => {
                    const sysCodes = report.codes.filter((c) => c.system === sys);
                    if (sysCodes.length === 0) return null;
                    return (
                      <div key={sys}>
                        <p className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{sys}</p>
                        <div className="space-y-1.5">
                          {sysCodes.map((c, i) => (
                            <CodeRow key={i} code={c} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Lab Trends ── */}
          {trendableTests.length > 0 && (
            <TabsContent value="trends" className="mt-4 space-y-6">
              <p className="text-xs text-muted-foreground">
                Lab value trends across all your reports containing the same test.
              </p>
              {trendableTests.map((testName) => {
                const data = buildTrendData(allReports, testName);
                const lab = report.summary?.labs.find((l) =>
                  l.test.toLowerCase().includes(testName.toLowerCase()),
                );
                return (
                  <Section key={testName} title={`${testName} Trend`}>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Unit: {lab?.unit ?? ""} · Reference: {lab?.range ?? ""}
                    </p>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: "0.75rem", fontSize: "0.75rem" }}
                          formatter={(v: number) => [`${v} ${lab?.unit ?? ""}`, testName]}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="oklch(0.68 0.115 188)"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Section>
                );
              })}
            </TabsContent>
          )}

          {/* ── Ask About This Report ── */}
          <TabsContent value="ask" className="mt-4 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Bot className="size-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Ask about this report</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ask any question and the AI will answer using only this document's content.
                  </p>
                </div>
              </div>
              <form onSubmit={askQuickQuestion} className="flex gap-2">
                <Input
                  className="rounded-xl"
                  placeholder="e.g. What does my HbA1c mean?"
                  value={quickQ}
                  onChange={(e) => setQuickQ(e.target.value)}
                  disabled={askingQ}
                />
                <Button type="submit" className="rounded-xl shrink-0" disabled={!quickQ.trim() || askingQ}>
                  {askingQ ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </form>
              {quickA && (
                <div className="rounded-xl bg-secondary px-4 py-3 text-sm leading-relaxed">
                  {quickA}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {[
                  "What are the abnormal values?",
                  "Explain the diagnosis in simple terms",
                  "What medications are prescribed?",
                  "What follow-up is needed?",
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuickQ(s)}
                    className="rounded-xl border border-border bg-background px-2.5 py-1 text-xs hover:border-primary/50 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── Original Text ── */}
          <TabsContent value="raw" className="mt-4">
            <p className="mb-3 text-xs text-muted-foreground">
              Raw text extracted from your document by OCR/PDF parser. This is the source material for the AI summary above.
            </p>
            <pre className="whitespace-pre-wrap rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground overflow-auto max-h-[600px]">
              {report.rawText || "No text extracted from this document."}
            </pre>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function CodeRow({ code }: { code: MedicalCode }) {
  const confPct = code.confidence <= 1 ? code.confidence * 100 : code.confidence;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary shrink-0">
        {code.system}
      </span>
      <span className="font-mono text-sm font-bold shrink-0">{code.code}</span>
      <span className="flex-1 text-sm text-muted-foreground truncate">{code.description}</span>
      <div className="shrink-0 flex items-center gap-1.5">
        <div className="h-1 w-12 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${confPct}%` }} />
        </div>
        <span className="text-xs text-muted-foreground">{confPct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

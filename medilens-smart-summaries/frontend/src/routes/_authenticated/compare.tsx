import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/services/config";
import { listReports } from "@/services/reports.service";
import type { Report } from "@/services/types";

export const Route = createFileRoute("/_authenticated/compare")({
  head: () => ({ meta: [{ title: "Compare Reports — MediLens" }] }),
  component: ComparePage,
});

interface LabDiff {
  test: string;
  before: string;
  after: string;
  unit: string;
  change: string;
  flagBefore: string;
  flagAfter: string;
}

interface CompareResult {
  report_a: string;
  report_b: string;
  diffs: LabDiff[];
  narrative: string;
}

function ComparePage() {
  const [reportA, setReportA] = useState("");
  const [reportB, setReportB] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: reports = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: listReports,
    retry: 1,
  });

  const labReports = reports.filter((r) => r.status === "completed" && r.summary);

  async function compare() {
    if (!reportA || !reportB || reportA === reportB) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiFetch<CompareResult>(
        `/compare?report_a=${reportA}&report_b=${reportB}`,
      );
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Comparison failed.");
    } finally {
      setLoading(false);
    }
  }

  function reportTitle(id: string) {
    return reports.find((r) => r.id === id)?.title ?? id;
  }

  return (
    <AppShell title="Compare Reports">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold">Compare Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select two completed reports to compare lab value trends
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-muted-foreground mb-1 block">Earlier report</label>
            <Select value={reportA} onValueChange={setReportA}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select report A" />
              </SelectTrigger>
              <SelectContent>
                {labReports.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title.slice(0, 45)} ({r.date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ArrowRight className="size-5 text-muted-foreground shrink-0 mt-5" />
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-muted-foreground mb-1 block">Later report</label>
            <Select value={reportB} onValueChange={setReportB}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select report B" />
              </SelectTrigger>
              <SelectContent>
                {labReports.map((r) => (
                  <SelectItem key={r.id} value={r.id} disabled={r.id === reportA}>
                    {r.title.slice(0, 45)} ({r.date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-5">
            <Button
              className="rounded-xl"
              disabled={!reportA || !reportB || reportA === reportB || loading}
              onClick={compare}
            >
              {loading ? "Comparing…" : "Compare"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Narrative
              </h2>
              <p className="text-sm leading-relaxed">{result.narrative}</p>
            </div>

            {result.diffs.length > 0 && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-secondary/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Test</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Before</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">After</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.diffs.map((d, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 font-medium">{d.test}</td>
                        <td className="px-4 py-3">
                          {d.before} {d.unit}{" "}
                          <FlagBadge flag={d.flagBefore} />
                        </td>
                        <td className="px-4 py-3">
                          {d.after} {d.unit}{" "}
                          <FlagBadge flag={d.flagAfter} />
                        </td>
                        <td className="px-4 py-3">
                          <ChangeBadge change={d.change} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {result.diffs.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No comparable lab values found between these two reports.
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function FlagBadge({ flag }: { flag: string }) {
  const styles: Record<string, string> = {
    high:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    low:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    normal: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${styles[flag] ?? ""}`}>
      {flag.toUpperCase()}
    </span>
  );
}

function ChangeBadge({ change }: { change: string }) {
  if (change === "improved")
    return (
      <span className="flex items-center gap-1 text-emerald-600 font-medium">
        <TrendingDown className="size-3.5" /> Improved
      </span>
    );
  if (change === "worsened")
    return (
      <span className="flex items-center gap-1 text-red-600 font-medium">
        <TrendingUp className="size-3.5" /> Worsened
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <Minus className="size-3.5" /> Stable
    </span>
  );
}

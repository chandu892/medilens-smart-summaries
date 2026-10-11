import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/services/config";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit Log — MediLens" }] }),
  component: AuditPage,
});

interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  detail: string;
  ip_address: string;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  login:    "text-blue-600  bg-blue-50  dark:bg-blue-900/20",
  register: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
  upload:   "text-violet-600 bg-violet-50 dark:bg-violet-900/20",
  delete:   "text-red-600   bg-red-50   dark:bg-red-900/20",
  verify:   "text-teal-600  bg-teal-50  dark:bg-teal-900/20",
};

function AuditPage() {
  const { data: logs = [], isLoading, isError } = useQuery<AuditEntry[]>({
    queryKey: ["audit-logs"],
    queryFn: () => apiFetch("/audit"),
    retry: 1,
  });

  return (
    <AppShell title="Audit Log">
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A complete record of all actions taken on your account
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Loading…
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            Could not load audit logs. Make sure the backend is running.
          </div>
        )}

        {!isLoading && !isError && logs.length === 0 && (
          <div className="py-12 text-center">
            <ClipboardList className="mx-auto mb-3 size-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No audit events recorded yet.</p>
          </div>
        )}

        {logs.length > 0 && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Resource</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Detail</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? "text-foreground bg-secondary"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{log.resource}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell max-w-xs truncate">{log.detail}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

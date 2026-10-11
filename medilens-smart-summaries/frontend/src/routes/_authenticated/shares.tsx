import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Loader2, Share2, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/services/config";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/shares")({
  head: () => ({ meta: [{ title: "Shared Records — MediLens" }] }),
  component: SharesPage,
});

interface SharedRecord {
  id: string;
  report_id: string;
  shared_with_email: string;
  expires_at: string | null;
  created_at: string;
}

function SharesPage() {
  const { data: shares = [], isLoading, isError } = useQuery<SharedRecord[]>({
    queryKey: ["shares"],
    queryFn: () => apiFetch("/shares"),
    retry: 1,
  });

  return (
    <AppShell title="Shared Records">
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Shared Records</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Records you have shared with healthcare providers or other users
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="size-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Controlled sharing</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Each share is time-limited and audited. The recipient sees only the reports you chose to share.
              </p>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Loading…
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            Could not load shares. Make sure the backend is running.
          </div>
        )}

        {!isLoading && !isError && shares.length === 0 && (
          <div className="py-12 text-center">
            <Share2 className="mx-auto mb-3 size-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No records shared yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You can share individual reports from the Report Detail page.
            </p>
            <Button asChild className="mt-4 rounded-xl" variant="outline">
              <Link to="/reports">Go to reports</Link>
            </Button>
          </div>
        )}

        {shares.length > 0 && (
          <div className="space-y-3">
            {shares.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Share2 className="size-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">Shared with: {s.shared_with_email}</p>
                  <p className="text-xs text-muted-foreground">
                    Report ID: {s.report_id.slice(0, 8)}…
                    {s.expires_at
                      ? ` · Expires: ${new Date(s.expires_at).toLocaleDateString()}`
                      : " · No expiry"}
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm" className="rounded-xl shrink-0">
                  <Link to="/reports/$id" params={{ id: s.report_id }}>
                    <ExternalLink className="size-3.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

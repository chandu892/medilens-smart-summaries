import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/services/config";

export const Route = createFileRoute("/_authenticated/timeline")({
  head: () => ({ meta: [{ title: "Health Timeline — MediLens" }] }),
  component: TimelinePage,
});

interface TimelineEvent {
  date: string;
  title: string;
  type: string;
  facility: string;
  doctor: string;
  reportId: string;
  status: string;
}

const TYPE_COLORS: Record<string, string> = {
  lab:               "bg-blue-500",
  prescription:      "bg-violet-500",
  radiology:         "bg-amber-500",
  discharge_summary: "bg-rose-500",
  consultation_note: "bg-emerald-500",
  follow_up:         "bg-teal-500",
};

function TimelinePage() {
  const { data: events = [], isLoading } = useQuery<TimelineEvent[]>({
    queryKey: ["timeline"],
    queryFn: () => apiFetch("/timeline"),
    retry: 1,
  });

  // Group by year-month
  const grouped: Record<string, TimelineEvent[]> = {};
  for (const e of [...events].reverse()) {
    const ym = e.date.slice(0, 7); // YYYY-MM
    if (!grouped[ym]) grouped[ym] = [];
    grouped[ym].push(e);
  }

  return (
    <AppShell title="Health Timeline">
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Health Timeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your medical events in chronological order
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground py-10">
            <Loader2 className="size-5 animate-spin" /> Loading timeline…
          </div>
        )}

        {!isLoading && events.length === 0 && (
          <div className="py-10 text-center text-muted-foreground">
            <Calendar className="mx-auto mb-3 size-10 opacity-30" />
            <p>No events yet. Upload reports to build your timeline.</p>
          </div>
        )}

        {Object.entries(grouped).reverse().map(([ym, evs]) => (
          <div key={ym}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {new Date(ym + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </h2>
            <div className="relative space-y-3 pl-5">
              {/* Vertical line */}
              <div className="absolute left-1.5 top-0 bottom-0 w-px bg-border" />
              {evs.map((e) => (
                <Link
                  key={e.reportId}
                  to="/reports/$id"
                  params={{ id: e.reportId }}
                  className="relative flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-card hover:shadow-glow transition-shadow"
                >
                  {/* Dot */}
                  <div
                    className={`absolute -left-[17px] top-5 size-3 rounded-full border-2 border-background ${
                      TYPE_COLORS[e.type] ?? "bg-primary"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm leading-tight">{e.title}</p>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="size-3" /> {e.date}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {e.facility} {e.doctor ? `· ${e.doctor}` : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

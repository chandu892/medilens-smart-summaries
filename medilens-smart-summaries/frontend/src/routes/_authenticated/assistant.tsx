import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Bot, Loader2, Send, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { askAssistant, listReports } from "@/services/reports.service";
import { useAuthUser } from "@/lib/auth-store";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({ meta: [{ title: "AI Assistant — MediLens" }] }),
  component: AssistantPage,
});

interface Message {
  role: "user" | "assistant";
  text: string;
}

const DOCTOR_SUGGESTIONS = [
  "Summarize key clinical findings and flagged abnormal labs",
  "Verify suggested ICD-10 & CPT billing codes for this patient",
  "Screen for drug interactions among prescribed medications",
  "Generate a clinical SOAP note summary",
  "Highlight glycemic and metabolic trends across reports",
];

const PATIENT_SUGGESTIONS = [
  "What do my HbA1c results mean for my daily life?",
  "Can I take Metformin with food?",
  "Explain my lab report in simple, non-medical terms",
  "Are any of my lab results flagged as abnormal?",
  "What lifestyle changes or follow-ups are recommended?",
];

function AssistantPage() {
  const user = useAuthUser();
  const isDoctor = user?.role === "doctor" || user?.role === "specialist";
  const suggestions = isDoctor ? DOCTOR_SUGGESTIONS : PATIENT_SUGGESTIONS;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [reportId, setReportId] = useState<string>("__all__");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: reports = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: listReports,
    retry: 1,
  });

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const question = text.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setLoading(true);

    try {
      const contextId = reportId === "__all__" ? undefined : reportId;
      const answer = await askAssistant(question, contextId);
      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I couldn't connect to the backend. Please try again." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <AppShell title={isDoctor ? "Clinical AI Co-Pilot" : "Medical Assistant"}>
      <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              {isDoctor ? "Clinical AI Co-Pilot" : "Medical Assistant"}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isDoctor
                ? "Differential diagnosis, ICD-10 coding, and clinical SOAP summary support"
                : "Ask questions about your reports in plain language"}
            </p>
          </div>
          <Select value={reportId} onValueChange={setReportId}>
            <SelectTrigger className="w-56 !h-9 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All reports</SelectItem>
              {reports.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.patient?.name ? `${r.patient.name}: ` : ""}
                  {r.title.slice(0, 30)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Disclaimer */}
        <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          {isDoctor
            ? "AI clinical recommendations are supportive and must be independently verified by the attending physician."
            : "AI responses are for informational purposes only. Always verify with your healthcare provider."}
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-6">
              <Bot className="size-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {isDoctor
                  ? "Ask about clinical findings, ICD-10 coding, or drug interactions."
                  : "Ask me anything about your medical reports."}
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs hover:border-primary/50 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Bot className="size-4 text-primary" />
                </span>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground"
                }`}
              >
                {m.text}
              </div>
              {m.role === "user" && (
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-xl bg-secondary">
                  <User className="size-4 text-muted-foreground" />
                </span>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Loader2 className="size-4 text-primary animate-spin" />
              </span>
              <div className="rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
                Thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); send(input); }}
        >
          <Input
            className="rounded-xl"
            placeholder={
              isDoctor
                ? "Ask about clinical findings, ICD-10 coding, or drug interactions…"
                : "Ask about your test results, medications, or diet…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" className="rounded-xl" disabled={!input.trim() || loading}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </AppShell>
  );
}

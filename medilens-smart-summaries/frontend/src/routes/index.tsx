import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Clock,
  FileSearch,
  FileUp,
  Languages,
  Lock,
  QrCode,
  ScanSearch,
  Share2,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import heroImage from "@/assets/hero.jpg";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediLens — Smarter Medical Summaries and Faster Decisions" },
      {
        name: "description",
        content:
          "Upload medical reports, extract key data with OCR and AI, generate structured summaries — built for patients, doctors, coders and researchers.",
      },
      { property: "og:title", content: "MediLens — Smarter Medical Summaries" },
      { property: "og:description", content: "AI-powered medical record management for everyone." },
    ],
  }),
  component: Landing,
});

// Abstract's 4-step pipeline
const steps = [
  { icon: FileUp,      label: "01", title: "Upload",    text: "Securely upload prescriptions, lab reports, discharge summaries, radiology — PDF or image." },
  { icon: FileSearch,  label: "02", title: "Extract",   text: "OCR + AI extracts diagnoses, medications, allergies, lab values with reference ranges and flags." },
  { icon: BrainCircuit,label: "03", title: "Summarize", text: "LLM generates a concise, role-aware summary. Original document is always preserved alongside." },
  { icon: BadgeCheck,  label: "04", title: "Verify",    text: "Clinicians verify every finding against the source before trusting it for any decision." },
];

// Abstract's 5 modules
const modules = [
  {
    icon: FileUp,
    title: "Module 1 — Upload & Storage",
    text: "Secure upload and storage of prescriptions, discharge summaries, lab reports and imaging. 10 MB limit, PDF/JPG/PNG. Original files are never overwritten.",
    color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
  },
  {
    icon: BrainCircuit,
    title: "Module 2 — AI Summarization",
    text: "OCR + LLM pipeline extracts structured data: diagnoses, medications, allergies, lab findings, treatment plans and follow-up instructions.",
    color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20",
  },
  {
    icon: Stethoscope,
    title: "Module 3 — Medical Q&A Assistant",
    text: "Ask plain-language questions about any report. Compares previous and new results, explains jargon, and displays an interactive health timeline.",
    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
  },
  {
    icon: QrCode,
    title: "Module 4 — Emergency QR",
    text: "Secure, time-limited QR code gives authorized emergency responders instant access to AI summaries, allergies, medications and critical history.",
    color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
  },
  {
    icon: Lock,
    title: "Module 5 — User Management & Security",
    text: "JWT authentication, six role types (Patient, Doctor, Specialist, Coder, Researcher, Insurer), encrypted storage, row-level access and full audit logs.",
    color: "text-rose-500 bg-rose-50 dark:bg-rose-900/20",
  },
];

// Why MediLens features
const features = [
  { icon: Sparkles,   title: "Role-aware summaries",  text: "Patients get plain language; clinicians get clinical density. The same report, the right depth." },
  { icon: ScanSearch, title: "OCR + AI extraction",   text: "Scanned PDFs and photos processed by pytesseract + LLM — no manual re-typing of lab values." },
  { icon: Clock,      title: "Health timeline",       text: "Every consultation, lab and imaging event ordered chronologically to show progression." },
  { icon: BadgeCheck, title: "Traceable output",      text: "Summaries always displayed alongside the original. Every fact links back to its source page." },
  { icon: Share2,     title: "Controlled sharing",    text: "Share specific records with other providers. Time-limited, audited, revocable." },
  { icon: Languages,  title: "Plain-language AI",     text: "Complex medical terminology explained in simple language without losing clinical accuracy." },
  { icon: Users,      title: "Six role types",        text: "Patient, Doctor, Specialist, Medical Coder, Researcher, Insurance Provider — each sees the right detail." },
  { icon: Lock,       title: "Private by design",     text: "Row-level security. Records belong to their owner. Emergency QR expires in 24 hours." },
];

// Tech stack
const techStack = [
  { label: "Frontend", value: "React 19 + TanStack Router + Tailwind 4" },
  { label: "Backend", value: "Python 3.11 + FastAPI + SQLite/PostgreSQL" },
  { label: "AI / LLM", value: "OpenAI GPT (optional) + offline rule-based fallback" },
  { label: "OCR", value: "pytesseract + Pillow + OpenCV preprocessing" },
  { label: "Auth", value: "JWT (python-jose + passlib/bcrypt)" },
  { label: "Codes", value: "ICD-10, CPT, LOINC, SNOMED CT auto-generation" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="rounded-xl">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="rounded-xl">
              <Link to="/register">
                <span className="sm:hidden">Start</span>
                <span className="hidden sm:inline">Get started free</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="bg-gradient-soft">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" /> AI for medical records
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Smarter Medical Summaries and{" "}
              <span className="text-gradient">Faster Decisions</span>
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              MediLens digitizes and summarizes medical records — prescriptions, lab reports, discharge summaries, radiology —
              so patients and clinicians spend less time reading and more time acting.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-xl">
                <Link to="/register">
                  Create your free account <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-xl">
                <Link to="/login">I already have an account</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Demo: <strong>patient@medilens.demo</strong> / <strong>MediLens@123</strong>
            </p>
          </div>
          <div className="relative">
            <img
              src={heroImage}
              alt="Doctor reviewing an AI-generated medical summary"
              width={1280}
              height={960}
              className="w-full rounded-2xl border border-border shadow-glow"
            />
          </div>
        </div>
      </section>

      {/* ── Pipeline steps ── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">How it works</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground">
          Four stages from a stack of documents to a decision you can defend.
        </p>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li
              key={s.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-card transition-transform hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="bg-gradient-hero flex size-10 items-center justify-center rounded-xl text-primary-foreground">
                  <s.icon className="size-5" aria-hidden />
                </span>
                <span className="text-sm font-bold text-muted-foreground">{s.label}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── 5 Modules ── */}
      <section className="bg-secondary/40 py-16 lg:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Five core modules</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground">
            Each module covers a distinct part of the medical record lifecycle.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <div
                key={m.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-glow transition-shadow"
              >
                <span className={`inline-flex size-10 items-center justify-center rounded-xl ${m.color}`}>
                  <m.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold text-sm">{m.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature grid ── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">Built for real clinics</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <f.icon className="size-5 text-primary" aria-hidden />
              <h3 className="mt-3 font-semibold text-sm">{f.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tech stack ── */}
      <section className="bg-secondary/40 py-16 lg:py-20">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Technology stack</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {techStack.map((t) => (
              <div key={t.label} className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.label}</p>
                <p className="mt-1 text-sm font-medium">{t.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="bg-gradient-hero rounded-2xl p-8 text-center text-primary-foreground shadow-glow sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to read records faster?</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm opacity-90">
            Create a MediLens account — choose your role and get started in under a minute.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6 rounded-xl">
            <Link to="/register">Get started free</Link>
          </Button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <Logo />
            <p className="text-sm text-muted-foreground max-w-xs">
              Smarter Medical Summaries and Faster Decisions
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 text-sm">
            <div>
              <p className="font-semibold text-foreground mb-2">App</p>
              <div className="space-y-1 text-muted-foreground">
                <Link to="/login" className="block hover:text-foreground">Sign in</Link>
                <Link to="/register" className="block hover:text-foreground">Create account</Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-2">Project</p>
              <div className="space-y-1 text-muted-foreground">
                <p>M. Chandrakanth Reddy</p>
                <p>Domala Poojitha</p>
                <p>Katta Poojitha</p>
                <p className="mt-2">CSE (AI &amp; ML)</p>
                <p>CVR College of Engineering</p>
                <p className="mt-1 text-xs">Guide: Mr. J. Phani Prasad</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} MediLens. Built with FastAPI + React + AI.
        </div>
      </footer>
    </div>
  );
}

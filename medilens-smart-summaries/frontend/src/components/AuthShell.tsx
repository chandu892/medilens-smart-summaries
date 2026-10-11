import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const highlights = [
  { icon: Sparkles, text: "AI summaries of reports, notes and discharge files" },
  { icon: Stethoscope, text: "Role-aware views for clinicians, coders and patients" },
  { icon: ShieldCheck, text: "Verified output with source traceability" },
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* Desktop brand panel */}
      <aside className="bg-gradient-hero relative hidden w-1/2 flex-col justify-between p-12 text-primary-foreground lg:flex">
        <Logo />
        <div className="max-w-md space-y-6">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Smarter Medical Summaries and Faster Decisions
          </h2>
          <ul className="space-y-4">
            {highlights.map((h) => (
              <li key={h.text} className="flex items-start gap-3 text-sm opacity-95">
                <h.icon className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span>{h.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs opacity-80">MediLens · CVR College of Engineering</p>
      </aside>

      <main className="flex w-full flex-1 flex-col bg-gradient-soft">
        <header className="flex items-center justify-between p-4 lg:justify-end lg:p-6">
          <div className="lg:hidden">
            <Logo />
          </div>
          <ThemeToggle />
        </header>

        <div className="flex flex-1 items-start justify-center px-4 pb-10 sm:items-center sm:px-6">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-6">{children}</div>
            {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
          </div>
        </div>

        <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← Back to home
          </Link>
        </footer>
      </main>
    </div>
  );
}

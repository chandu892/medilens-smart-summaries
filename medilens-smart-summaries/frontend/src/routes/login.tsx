import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HeartPulse, Lock, ShieldCheck, Stethoscope, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/AuthShell";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUser } from "@/services/auth.service";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — MediLens" },
      { name: "description", content: "Sign in to MediLens to access your doctor or patient workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeQuickRole, setActiveQuickRole] = useState<string | null>(null);

  async function performLogin(targetEmail: string, targetPass: string) {
    setLoading(true);
    try {
      const user = await loginUser(targetEmail.trim(), targetPass);
      const greeting = user.role === "doctor" || user.role === "specialist"
        ? `Welcome to Clinical Cockpit, ${user.full_name || "Doctor"}`
        : `Welcome back, ${user.full_name || "Patient"}`;
      toast.success(greeting);
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Incorrect email or password.");
    } finally {
      setLoading(false);
      setActiveQuickRole(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await performLogin(email, password);
  }

  function handleQuickLogin(role: "doctor" | "patient") {
    setActiveQuickRole(role);
    if (role === "doctor") {
      setEmail("doctor@medilens.demo");
      setPassword("MediLens@123");
      performLogin("doctor@medilens.demo", "MediLens@123");
    } else {
      setEmail("patient@medilens.demo");
      setPassword("MediLens@123");
      performLogin("patient@medilens.demo", "MediLens@123");
    }
  }

  return (
    <AuthShell
      title="Welcome to MediLens"
      subtitle="Sign in to your medical workspace to access verified clinical summaries."
      footer={
        <span className="text-muted-foreground">
          New to MediLens?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="you@hospital.org"
            className="h-11 rounded-xl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit" className="h-11 w-full rounded-xl shadow-glow font-medium" disabled={loading}>
          {loading && !activeQuickRole ? "Signing in…" : "Sign in to Workspace"}
        </Button>
      </form>

      {/* 1-Click Demo Logins for Doctor & Patient */}
      <div className="mt-6 border-t border-border/80 pt-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" /> Instant Role Demo
          </span>
          <span className="text-[11px] text-muted-foreground">Click to sign in</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleQuickLogin("doctor")}
            className="group relative flex flex-col items-start gap-1 rounded-xl border border-primary/30 bg-primary/5 p-3 text-left transition-all hover:bg-primary/10 hover:border-primary/50 hover:shadow-card disabled:opacity-50"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Stethoscope className="size-4" />
              <span>Doctor Role</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Dr. Anjali Mehta · Clinical review & approvals
            </p>
            {activeQuickRole === "doctor" && (
              <span className="text-[10px] text-primary font-medium mt-1">Logging in…</span>
            )}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleQuickLogin("patient")}
            className="group relative flex flex-col items-start gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-left transition-all hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:shadow-card disabled:opacity-50"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <HeartPulse className="size-4" />
              <span>Patient Role</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Ravi Kumar · Health passport & lab summaries
            </p>
            {activeQuickRole === "patient" && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">Logging in…</span>
            )}
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

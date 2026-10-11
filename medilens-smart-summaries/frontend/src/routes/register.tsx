import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, ShieldAlert, Stethoscope, User } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/AuthShell";
import { PasswordInput } from "@/components/PasswordInput";
import { PasswordStrength } from "@/components/PasswordStrength";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LICENSE_REQUIRED_ROLES, USER_ROLES, type UserRole } from "@/lib/roles";
import { scorePassword } from "@/lib/password";
import { registerUser } from "@/services/auth.service";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — MediLens" },
      { name: "description", content: "Sign up for MediLens doctor or patient workspace." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<UserRole>("patient");
  const [license, setLicense] = useState("");
  const [loading, setLoading] = useState(false);

  const needsLicense = LICENSE_REQUIRED_ROLES.includes(role);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    if (scorePassword(password).score < 2) {
      toast.error("Please choose a stronger password.");
      return;
    }
    if (needsLicense && !license.trim()) {
      toast.error("A medical license number is required for doctor and specialist accounts.");
      return;
    }

    setLoading(true);
    try {
      const user = await registerUser({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        role,
        ...(needsLicense && license.trim() ? { license_number: license.trim() } : {}),
      });
      const greeting = user.role === "doctor" || user.role === "specialist"
        ? `Doctor account created! Welcome, ${user.full_name || "Doctor"}`
        : "Patient account created — welcome to MediLens!";
      toast.success(greeting);
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your MediLens account"
      subtitle="Select your clinical or patient role for a personalized experience."
      footer={
        <span className="text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            required
            autoComplete="name"
            placeholder={role === "doctor" || role === "specialist" ? "Dr. Anjali Rao" : "Ravi Kumar"}
            className="h-11 rounded-xl"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            required
            autoComplete="email"
            placeholder="you@hospital.org"
            className="h-11 rounded-xl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role">Account Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger id="role" className="!h-11 w-full rounded-xl">
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              {USER_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Role guidance callout */}
          <div className="mt-1.5 rounded-xl bg-secondary/60 p-2.5 text-xs text-muted-foreground flex items-start gap-2">
            {needsLicense ? (
              <>
                <Stethoscope className="size-4 shrink-0 text-primary mt-0.5" />
                <span>
                  <strong>Physician Cockpit:</strong> Full access to patient review queues, clinical sign-offs, critical lab alerts, and ICD-10 coding.
                </span>
              </>
            ) : (
              <>
                <User className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <span>
                  <strong>Patient Portal:</strong> Personal health record management, clear layman AI summaries, and emergency QR pass.
                </span>
              </>
            )}
          </div>
        </div>

        {needsLicense && (
          <div className="space-y-1.5">
            <Label htmlFor="license" className="flex items-center gap-1.5 text-primary">
              <BadgeCheck className="size-3.5" /> Medical License Number *
            </Label>
            <Input
              id="license"
              required
              placeholder="e.g. TSMC-48213 or MCI-10492"
              className="h-11 rounded-xl border-primary/40 focus:border-primary"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="password">Password (minimum 8 characters)</Label>
          <PasswordInput
            id="password"
            required
            autoComplete="new-password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordStrength password={password} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm Password</Label>
          <PasswordInput
            id="confirm"
            required
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {confirm && confirm !== password && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <ShieldAlert className="size-3" /> Passwords don't match.
            </p>
          )}
        </div>

        <Button type="submit" className="h-11 w-full rounded-xl shadow-glow font-medium" disabled={loading}>
          {loading ? "Creating account…" : "Complete Registration"}
        </Button>
      </form>
    </AuthShell>
  );
}

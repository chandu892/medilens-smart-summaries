import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthShell } from "@/components/AuthShell";
import { OtpField } from "@/components/OtpField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { resetPassword } from "@/services/auth.service";

export const Route = createFileRoute("/verify-reset")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search["email"] === "string" ? search["email"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Reset your password — MediLens" },
      { name: "description", content: "Enter your OTP and new password." },
    ],
  }),
  component: VerifyResetPage,
});

function VerifyResetPage() {
  const { email } = Route.useSearch();
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [newPw, setNewPw] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 6) { toast.error("Enter the 6-digit code."); return; }
    if (newPw.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      await resetPassword(email, otp, newPw);
      toast.success("Password reset! Please sign in with your new password.");
      navigate({ to: "/login" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle={`Enter the 6-digit code sent to ${email || "your email"} and choose a new password.`}
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <OtpField value={otp} onChange={setOtp} disabled={loading} />
        <div className="space-y-1.5">
          <Label htmlFor="newPw">New password</Label>
          <PasswordInput
            id="newPw"
            required
            autoComplete="new-password"
            placeholder="New password (min 8 chars)"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="h-11 w-full rounded-xl"
          disabled={loading || otp.length < 6}
        >
          {loading ? "Resetting…" : "Reset password"}
        </Button>
      </form>
    </AuthShell>
  );
}

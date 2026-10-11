import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendForgotPassword } from "@/services/auth.service";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — MediLens" },
      { name: "description", content: "Request a MediLens password reset code." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await sendForgotPassword(email.trim());
    } catch {}
    setLoading(false);
    // Neutral message — never reveal whether the account exists
    toast.success(
      "If an account exists for that email, a reset code has been sent. Check your inbox or the backend console.",
    );
    navigate({ to: "/verify-reset", search: { email: email.trim() } });
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a 6-digit reset code."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
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
        <Button type="submit" className="h-11 w-full rounded-xl" disabled={loading}>
          {loading ? "Sending…" : "Send reset code"}
        </Button>
      </form>
    </AuthShell>
  );
}

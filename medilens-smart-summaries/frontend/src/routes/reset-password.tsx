/**
 * reset-password — Legacy Supabase magic-link target.
 * With local backend, reset is handled via verify-reset OTP flow instead.
 * Redirect to forgot-password for fresh start.
 */
import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/AuthShell";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Reset password — MediLens" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to forgot-password to use the OTP flow
    navigate({ to: "/forgot-password", replace: true });
  }, [navigate]);

  return (
    <AuthShell
      title="Reset password"
      subtitle="Redirecting you to the password reset page…"
      footer={
        <Link to="/forgot-password" className="font-medium text-primary hover:underline">
          Go now
        </Link>
      }
    >
      <div className="py-4" />
    </AuthShell>
  );
}

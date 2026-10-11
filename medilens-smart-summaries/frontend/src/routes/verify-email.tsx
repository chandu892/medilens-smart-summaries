/**
 * verify-email route — kept for compatibility but redirects to login
 * since we now use the local FastAPI backend (no email verification step).
 */
import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search["email"] === "string" ? search["email"] : "",
  }),
  head: () => ({
    meta: [{ title: "Account created — MediLens" }],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();

  // With the local FastAPI backend, email verification is not required.
  // Redirect straight to dashboard after a short moment.
  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/dashboard" }), 1500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <AuthShell
      title="Account created!"
      subtitle="You'll be redirected to your dashboard in a moment."
      footer={
        <Link to="/dashboard" className="font-medium text-primary hover:underline">
          Go to dashboard now
        </Link>
      }
    >
      <div className="flex items-center justify-center py-6">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    </AuthShell>
  );
}

/**
 * auth/callback — Legacy Supabase OAuth callback route.
 * With the local backend we redirect straight to dashboard or login.
 */
import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { getToken } from "@/lib/auth-store";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Redirecting — MediLens" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // If already logged in via local JWT, go to dashboard
    if (getToken()) {
      navigate({ to: "/dashboard", replace: true });
    } else {
      navigate({ to: "/login", replace: true });
    }
  }, [navigate]);

  return (
    <div className="bg-gradient-soft flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <Loader2 className="mx-auto size-7 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Redirecting…</p>
      </div>
    </div>
  );
}

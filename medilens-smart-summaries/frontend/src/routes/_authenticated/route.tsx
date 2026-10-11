import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getToken } from "@/lib/auth-store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    // Use local JWT auth — no Supabase needed
    if (!getToken()) {
      throw redirect({ to: "/login" });
    }
  },
  component: () => <Outlet />,
});

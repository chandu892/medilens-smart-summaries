import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/forbidden")({
  head: () => ({
    meta: [
      { title: "Access denied — MediLens" },
      { name: "description", content: "You don't have permission to view this MediLens page." },
      { property: "og:title", content: "Access denied — MediLens" },
      { property: "og:description", content: "This area requires additional permissions." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Forbidden,
});

function Forbidden() {
  return (
    <div className="bg-gradient-soft flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <ShieldAlert className="mx-auto size-12 text-primary" />
        <p className="text-gradient mt-4 text-6xl font-bold">403</p>
        <h1 className="mt-3 text-xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your role doesn't have permission to open this page. If you think that's wrong, contact
          your MediLens administrator.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild className="rounded-xl">
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { ScanSearch } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="bg-gradient-hero flex size-9 items-center justify-center rounded-xl text-primary-foreground shadow-card">
        <ScanSearch className="size-5" aria-hidden />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-lg font-bold tracking-tight">MediLens</span>
          <span className="hidden text-[11px] text-muted-foreground sm:block">
            Smarter medical summaries
          </span>
        </span>
      )}
    </Link>
  );
}

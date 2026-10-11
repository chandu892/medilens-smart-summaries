/**
 * AppShell — shared layout for all authenticated pages.
 * Sticky navbar + mobile drawer. All authenticated pages use this.
 */
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BrainCircuit,
  ClipboardList,
  Clock,
  FileText,
  FileUp,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  Settings,
  Share2,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { clearAuth, useAuthUser } from "@/lib/auth-store";
import { roleLabel } from "@/lib/roles";

type NavRoute =
  | "/dashboard"
  | "/upload"
  | "/reports"
  | "/assistant"
  | "/compare"
  | "/timeline"
  | "/qr"
  | "/settings"
  | "/shares"
  | "/audit";

interface NavItem {
  to: NavRoute;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const NAV_PRIMARY: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/upload",    icon: FileUp,          label: "Upload" },
  { to: "/reports",   icon: FileText,        label: "Reports" },
  { to: "/assistant", icon: BrainCircuit,    label: "Assistant" },
  { to: "/compare",   icon: TrendingUp,      label: "Compare" },
  { to: "/timeline",  icon: Clock,           label: "Timeline" },
  { to: "/qr",        icon: QrCode,          label: "QR Code" },
];

const NAV_SECONDARY: NavItem[] = [
  { to: "/shares",   icon: Share2,        label: "Shared Records" },
  { to: "/audit",    icon: ClipboardList, label: "Audit Log" },
  { to: "/settings", icon: Settings,      label: "Settings" },
];

const ALL_NAV = [...NAV_PRIMARY, ...NAV_SECONDARY];

export function AppShell({
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const user = useAuthUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  function isActive(to: string) {
    return currentPath === to || currentPath.startsWith(to + "/");
  }

  function signOut() {
    clearAuth();
    navigate({ to: "/login", replace: true });
  }

  function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
    const active = isActive(item.to);
    return (
      <Link
        to={item.to}
        onClick={onClick}
        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
          active
            ? "bg-primary/10 text-primary font-semibold"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <item.icon className="size-4 shrink-0" />
        {item.label}
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top navbar ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            {/* Desktop nav — primary only */}
            <nav className="hidden lg:flex items-center gap-0.5" aria-label="Main navigation">
              {NAV_PRIMARY.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition-colors ${
                    isActive(n.to)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <n.icon className="size-3.5" />
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {/* User pill — desktop */}
            {user && (
              <span className="hidden sm:flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
                {user.full_name || user.email}
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {roleLabel(user.role)}
                </span>
              </span>
            )}
            <Button variant="outline" size="sm" className="hidden sm:flex rounded-xl" onClick={signOut}>
              <LogOut className="mr-1 size-3.5" /> Sign out
            </Button>
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-72 border-l border-border bg-background overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <Logo compact />
              <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setMobileOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>

            {/* User info */}
            {user && (
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-medium">{user.full_name || user.email}</p>
                <p className="text-xs text-muted-foreground">{roleLabel(user.role)}</p>
                {user.license_number && (
                  <p className="text-xs text-muted-foreground">Lic: {user.license_number}</p>
                )}
              </div>
            )}

            <nav className="px-3 py-3 space-y-0.5">
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Main
              </p>
              {NAV_PRIMARY.map((n) => (
                <NavLink key={n.to} item={n} onClick={() => setMobileOpen(false)} />
              ))}
              <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Account
              </p>
              {NAV_SECONDARY.map((n) => (
                <NavLink key={n.to} item={n} onClick={() => setMobileOpen(false)} />
              ))}
            </nav>

            <div className="px-4 py-4 border-t border-border">
              <Button variant="outline" className="w-full rounded-xl" onClick={signOut}>
                <LogOut className="mr-2 size-4" /> Sign out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page content ── */}
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}

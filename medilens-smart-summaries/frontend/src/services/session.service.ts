/**
 * Session service — uses local JWT auth-store only (no Supabase).
 * Kept for compatibility; all auth is now handled by auth-store.ts + auth.service.ts.
 */
import { useSyncExternalStore } from "react";
import type { UserRole } from "@/lib/roles";
import { getStoredUser, clearAuth } from "@/lib/auth-store";

export interface Profile {
  full_name: string;
  email: string | null;
  role: UserRole;
  license_number: string | null;
}

export async function getProfile(): Promise<Profile | null> {
  const user = getStoredUser();
  if (!user) return null;
  return {
    full_name: user.full_name,
    email: user.email,
    role: user.role as UserRole,
    license_number: user.license_number,
  };
}

export async function signOutUser() {
  clearAuth();
}

// Demo role switcher — local override for exploring each role's menus.
const KEY = "medilens-demo-role";
const listeners = new Set<() => void>();
function read(): UserRole | null {
  return typeof localStorage === "undefined" ? null : (localStorage.getItem(KEY) as UserRole | null);
}
export function setDemoRole(role: UserRole | null) {
  if (role) localStorage.setItem(KEY, role);
  else localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function useDemoRole() {
  return useSyncExternalStore(subscribe, read, () => null);
}

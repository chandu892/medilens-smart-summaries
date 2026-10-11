/**
 * Simple localStorage-backed auth store for the local backend JWT flow.
 * Completely independent of Supabase.
 */
import { useSyncExternalStore } from "react";

export interface AuthUser {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  license_number: string | null;
  token: string;
}

const TOKEN_KEY = "ml_token";
const USER_KEY = "ml_user";

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function saveAuth(user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, user.token);
  const raw = JSON.stringify(user);
  localStorage.setItem(USER_KEY, raw);
  cachedUser = user;
  lastRaw = raw;
  notify();
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  cachedUser = null;
  lastRaw = null;
  notify();
}


let cachedUser: AuthUser | null = null;
let lastRaw: string | null = null;

export function getStoredUser(): AuthUser | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    cachedUser = null;
    lastRaw = null;
    return null;
  }
  if (raw === lastRaw && cachedUser !== null) {
    return cachedUser;
  }
  try {
    cachedUser = JSON.parse(raw) as AuthUser;
    lastRaw = raw;
    return cachedUser;
  } catch {
    cachedUser = null;
    lastRaw = null;
    return null;
  }
}


export function getToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAuthUser(): AuthUser | null {
  return useSyncExternalStore(subscribe, getStoredUser, () => null);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

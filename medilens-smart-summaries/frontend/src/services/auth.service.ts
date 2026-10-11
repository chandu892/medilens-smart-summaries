/**
 * Auth service — calls the FastAPI /auth endpoints.
 * Stores the JWT in localStorage via auth-store.
 */
import { apiFetch } from "./config";
import { saveAuth, clearAuth, type AuthUser } from "@/lib/auth-store";

interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  license_number: string | null;
}

export async function loginUser(email: string, password: string): Promise<AuthUser> {
  const res = await apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const user: AuthUser = {
    user_id: res.user_id,
    email: res.email,
    full_name: res.full_name,
    role: res.role,
    license_number: res.license_number,
    token: res.access_token,
  };
  saveAuth(user);
  return user;
}

export async function registerUser(opts: {
  email: string;
  password: string;
  full_name: string;
  role: string;
  license_number?: string;
}): Promise<AuthUser> {
  const res = await apiFetch<TokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(opts),
  });
  const user: AuthUser = {
    user_id: res.user_id,
    email: res.email,
    full_name: res.full_name,
    role: res.role,
    license_number: res.license_number,
    token: res.access_token,
  };
  saveAuth(user);
  return user;
}

export async function logoutUser(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {}
  clearAuth();
}

export async function sendForgotPassword(email: string): Promise<void> {
  await apiFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  email: string,
  otp: string,
  new_password: string,
): Promise<void> {
  await apiFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, otp, new_password }),
  });
}

export async function updateProfile(opts: {
  full_name?: string;
  license_number?: string;
}): Promise<void> {
  await apiFetch("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(opts),
  });
}

export async function changePassword(
  current_password: string,
  new_password: string,
): Promise<void> {
  await apiFetch("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
  });
}

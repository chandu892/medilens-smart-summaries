/**
 * Centralised API client for the FastAPI backend.
 * Reads the token from localStorage and injects it as Authorization: Bearer.
 * Redirects to /login on 401.
 */

export const API_BASE_URL: string =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "http://localhost:8000/api";

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("ml_token") : null;

  const headers = new Headers(init.headers as HeadersInit | undefined);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    if (typeof localStorage !== "undefined") localStorage.removeItem("ml_token");
    window.location.href = "/login";
    throw new Error("Unauthenticated");
  }

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) msg = body.detail;
    } catch {}
    throw new Error(msg);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

/** Upload a file using multipart/form-data. */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("ml_token") : null;
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Do NOT set Content-Type — browser sets it with the boundary

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (res.status === 401) {
    if (typeof localStorage !== "undefined") localStorage.removeItem("ml_token");
    window.location.href = "/login";
    throw new Error("Unauthenticated");
  }

  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) msg = body.detail;
    } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

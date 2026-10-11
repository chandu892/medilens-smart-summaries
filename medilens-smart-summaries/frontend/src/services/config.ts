/**
 * API config — points at the FastAPI backend.
 * Set VITE_API_BASE_URL in .env to override (e.g. for production).
 * Defaults to http://localhost:8000/api for local development.
 */
import { apiFetch as _apiFetch } from "@/lib/api";

export const API_BASE_URL: string =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "http://localhost:8000/api";

/**
 * USE_MOCKS is always false now — all data comes from the FastAPI backend.
 * The mock code is kept in mock-data.ts only as a reference / fallback.
 */
export const USE_MOCKS = false;

export const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return _apiFetch<T>(path, init);
}

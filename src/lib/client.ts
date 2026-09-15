import type { ApiResult } from "@/types";

/**
 * Small typed fetch helper for client components.
 * Throws a user-safe error message from the standard API envelope.
 */
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });

  let json: ApiResult<T>;
  try {
    json = (await res.json()) as ApiResult<T>;
  } catch {
    throw new Error("Unexpected server response. Please try again.");
  }

  if (!res.ok || !json.success) {
    const message = json && "error" in json ? json.error.message : "Request failed. Please try again.";
    throw new Error(message);
  }

  return json.data;
}

/**
 * POST helper that returns the raw API envelope (never throws).
 * Components check `success` / `error.message` on the result.
 */
export async function apiPost<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });

  try {
    return (await res.json()) as ApiResult<T>;
  } catch {
    return {
      success: false,
      error: { code: "UNEXPECTED_RESPONSE", message: "Unexpected server response. Please try again." },
    };
  }
}

/**
 * GET helper that returns the raw API envelope (never throws).
 */
export async function apiGet<T>(url: string): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  try {
    return (await res.json()) as ApiResult<T>;
  } catch {
    return {
      success: false,
      error: { code: "UNEXPECTED_RESPONSE", message: "Unexpected server response. Please try again." },
    };
  }
}

/**
 * DELETE helper that returns the raw API envelope (never throws).
 */
export async function apiDelete<T>(url: string): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });

  try {
    return (await res.json()) as ApiResult<T>;
  } catch {
    return {
      success: false,
      error: { code: "UNEXPECTED_RESPONSE", message: "Unexpected server response. Please try again." },
    };
  }
}

/**
 * Core HTTP client for Supabase Edge Functions.
 *
 * All requests are routed through `{SUPABASE_URL}/functions/v1/{functionName}`.
 * The anon key is attached as the `apikey` header (no JWT required).
 */

import type { ApiResponse, ApiErrorDetail } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function callFunction<T>(
  functionName: string,
  body?: unknown,
  method: "POST" | "GET" = "POST"
): Promise<ApiResponse<T>> {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json();

    if (!res.ok) {
      const errorDetail: ApiErrorDetail = json.error?.code
        ? json.error
        : { code: "UNKNOWN_ERROR", message: json.error || "Unknown error" };
      return { error: errorDetail, status: res.status };
    }

    return { data: json as T, status: res.status };
  } catch {
    return {
      error: { code: "NETWORK_ERROR", message: "Network error. Please check your connection." },
      status: 0,
    };
  }
}

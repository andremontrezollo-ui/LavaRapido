/**
 * Backend Client — single entry point for all Edge Function calls.
 *
 * Hides the Supabase URL, API key, and fetch details from the rest of the
 * frontend.  All callers import typed functions from here — never fetch()
 * directly or import from @/integrations/supabase/client.
 */

import type {
  MixSessionResponse,
  MixSessionStatusResponse,
  MixSessionStatusRequest,
} from "@/contracts/mix-session";

// ---------------------------------------------------------------------------
// Internal configuration (never exported)
// ---------------------------------------------------------------------------

const BASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// ---------------------------------------------------------------------------
// Shared error type
// ---------------------------------------------------------------------------

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResult<T> {
  data?: T;
  error?: ApiError;
  status: number;
}

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

async function invoke<T>(
  functionName: string,
  body?: unknown,
  method: "POST" | "GET" = "POST"
): Promise<ApiResult<T>> {
  const url = `${BASE_URL}/functions/v1/${functionName}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: API_KEY,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const json = await res.json();

    if (!res.ok) {
      const errorDetail: ApiError =
        json?.error?.code
          ? (json.error as ApiError)
          : { code: "UNKNOWN_ERROR", message: json?.error ?? "Unknown error" };
      return { error: errorDetail, status: res.status };
    }

    return { data: json as T, status: res.status };
  } catch {
    return {
      error: {
        code: "NETWORK_ERROR",
        message: "Network error. Please check your connection.",
      },
      status: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Mix Sessions
// ---------------------------------------------------------------------------

/** Create a new mixing session. */
export function createMixSession(): Promise<ApiResult<MixSessionResponse>> {
  return invoke<MixSessionResponse>("mix-sessions");
}

/** Query the status of an existing session. */
export function getMixSessionStatus(
  req: MixSessionStatusRequest
): Promise<ApiResult<MixSessionStatusResponse>> {
  return invoke<MixSessionStatusResponse>("mix-session-status", req);
}

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

export interface ContactRequest {
  subject: string;
  message: string;
  replyContact?: string;
}

export interface ContactResponse {
  ticketId: string;
  createdAt: string;
}

export function createContactTicket(
  data: ContactRequest
): Promise<ApiResult<ContactResponse>> {
  return invoke<ContactResponse>("contact", data);
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: string;
  uptime: number;
  version: string;
  timestamp: string;
}

export function getHealthStatus(): Promise<ApiResult<HealthResponse>> {
  return invoke<HealthResponse>("health", undefined, "GET");
}

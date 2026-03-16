/**
 * API client for backend edge functions
 * Standardized /api/v1 pattern via Edge Functions
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface ApiResponse<T> {
  data?: T;
  error?: ApiErrorDetail;
  status: number;
}

async function callFunction<T>(functionName: string, body?: unknown, method: "POST" | "GET" = "POST"): Promise<ApiResponse<T>> {
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

// --- Mix Sessions ---

export interface MixSessionResponse {
  /** Internal UUID — for display only; do not use for status lookups. */
  sessionId: string;
  /** Opaque token for status lookups via getMixSessionStatus(). */
  statusToken: string;
  depositAddress: string;
  createdAt: string;
  expiresAt: string;
  status: string;
}

export interface SessionStatusResponse {
  status: string;
  expiresAt: string;
  createdAt: string;
}

export function createMixSession() {
  return callFunction<MixSessionResponse>("mix-sessions");
}

/** Look up session status using the opaque statusToken (never the internal UUID). */
export function getMixSessionStatus(statusToken: string) {
  return callFunction<SessionStatusResponse>("mix-session-status", { statusToken });
}

// --- Contact ---

export interface ContactResponse {
  ticketId: string;
  createdAt: string;
}

export function createContactTicket(data: { subject: string; message: string; replyContact?: string }) {
  return callFunction<ContactResponse>("contact", data);
}

// --- Health ---

export interface HealthResponse {
  status: string;
  uptime: number;
  version: string;
  timestamp: string;
}

export function getHealthStatus() {
  return callFunction<HealthResponse>("health");
}

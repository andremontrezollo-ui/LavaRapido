/**
 * Canonical contract for the mix-sessions Edge Function.
 *
 * Both the frontend (src/services/backend-client.ts) and the Edge Function
 * (supabase/functions/mix-sessions/index.ts) must conform to these shapes.
 * Never duplicate these types elsewhere in the codebase.
 */

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

/** POST /functions/v1/mix-sessions — no body required. */
export type MixSessionRequest = Record<string, never>;

/** POST /functions/v1/mix-session-status */
export interface MixSessionStatusRequest {
  sessionId: string;
}

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

export type MixSessionStatus =
  | "active"
  | "pending_deposit"
  | "processing"
  | "completed"
  | "expired";

/** Successful response from POST /functions/v1/mix-sessions (HTTP 201) */
export interface MixSessionResponse {
  sessionId: string;
  depositAddress: string;
  createdAt: string;   // ISO 8601
  expiresAt: string;   // ISO 8601
  status: MixSessionStatus;
}

/** Successful response from POST /functions/v1/mix-session-status (HTTP 200) */
export interface MixSessionStatusResponse {
  sessionId: string;
  status: MixSessionStatus;
  expiresAt: string;   // ISO 8601
  createdAt: string;   // ISO 8601
}

// ---------------------------------------------------------------------------
// Validation helpers (shared between frontend and test code)
// ---------------------------------------------------------------------------

/**
 * Validates that a raw object matches the MixSessionResponse shape.
 * Returns the typed value or throws on failure.
 */
export function parseMixSessionResponse(raw: unknown): MixSessionResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid mix session response: not an object");
  }
  const obj = raw as Record<string, unknown>;
  const required: (keyof MixSessionResponse)[] = [
    "sessionId",
    "depositAddress",
    "createdAt",
    "expiresAt",
    "status",
  ];
  for (const key of required) {
    if (typeof obj[key] !== "string") {
      throw new Error(`Invalid mix session response: missing or invalid field "${key}"`);
    }
  }
  return obj as unknown as MixSessionResponse;
}

/**
 * Validates that a raw object matches the MixSessionStatusResponse shape.
 */
export function parseMixSessionStatusResponse(raw: unknown): MixSessionStatusResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid session status response: not an object");
  }
  const obj = raw as Record<string, unknown>;
  const required: (keyof MixSessionStatusResponse)[] = [
    "sessionId",
    "status",
    "expiresAt",
    "createdAt",
  ];
  for (const key of required) {
    if (typeof obj[key] !== "string") {
      throw new Error(`Invalid session status response: missing or invalid field "${key}"`);
    }
  }
  return obj as unknown as MixSessionStatusResponse;
}

/**
 * Edge Function Container
 *
 * Wires the backend use cases with Supabase-specific infrastructure adapters.
 * Each Edge Function calls getContainer() to get ready-to-use use case instances.
 *
 * Architecture boundary:
 *   ┌──────────────────┐     ┌──────────────────────────┐
 *   │  backend/modules │     │  supabase/functions      │
 *   │  (domain logic,  │ ◄── │  _shared/container.ts    │
 *   │   use cases,     │     │  (Supabase adapters)     │
 *   │   port types)    │     └──────────────────────────┘
 *   └──────────────────┘
 *
 * NOTE: Deno cannot import Node.js-style TypeScript modules directly,
 * so the use case orchestration logic is co-located here, following the
 * exact same patterns as backend/src/bootstrap/container.ts.
 * The canonical domain definitions and interfaces live in backend/src/modules/.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSupabaseClient } from "./bootstrap.ts";
import { hashString } from "./request.ts";

// ---------------------------------------------------------------------------
// Rate Limiter (Supabase-backed)
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  endpoint: string;
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  retryAfterSeconds: number;
}

export async function checkRateLimit(
  ipHash: string,
  config: RateLimitConfig,
  supabase: SupabaseClient,
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - config.windowSeconds * 1000).toISOString();
  const { count } = await supabase
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("endpoint", config.endpoint)
    .gte("created_at", windowStart);

  const current = count ?? 0;
  const allowed = current < config.maxRequests;
  return {
    allowed,
    count: current,
    remaining: Math.max(0, config.maxRequests - current),
    retryAfterSeconds: allowed ? 0 : config.windowSeconds,
  };
}

export async function recordRateLimit(
  ipHash: string,
  endpoint: string,
  supabase: SupabaseClient,
): Promise<void> {
  await supabase.from("rate_limits").insert({ ip_hash: ipHash, endpoint });
}

// ---------------------------------------------------------------------------
// Address Generator (Testnet)
// Maps to: backend/src/modules/mix-session/application/ports/address-generator.port.ts
// ---------------------------------------------------------------------------

const TESTNET_CHARSET = "0123456789abcdefghijklmnopqrstuvwxyz";

function generateTestnetAddress(): string {
  const body = new Uint8Array(38);
  crypto.getRandomValues(body);
  const encoded = Array.from(body, (b) => TESTNET_CHARSET[b % TESTNET_CHARSET.length]).join("");
  return `tb1q${encoded.slice(0, 38)}`;
}

// ---------------------------------------------------------------------------
// CreateMixSession Use Case (Supabase-backed)
// Maps to: backend/src/modules/mix-session/application/use-cases/create-mix-session.usecase.ts
// ---------------------------------------------------------------------------

export interface CreateMixSessionRequest {
  clientFingerprintHash: string;
}

export interface CreateMixSessionResponse {
  sessionId: string;
  depositAddress: string;
  createdAt: string;
  expiresAt: string;
  status: string;
}

export async function createMixSession(
  request: CreateMixSessionRequest,
  supabase: SupabaseClient,
): Promise<CreateMixSessionResponse> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 min TTL
  const depositAddress = generateTestnetAddress();

  const { data, error } = await supabase
    .from("mix_sessions")
    .insert({
      deposit_address: depositAddress,
      status: "active",
      expires_at: expiresAt.toISOString(),
      client_fingerprint_hash: request.clientFingerprintHash,
    })
    .select("id, deposit_address, created_at, expires_at, status")
    .single();

  if (error || !data) throw new Error("DB error creating session");

  return {
    sessionId: data.id,
    depositAddress: data.deposit_address,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
    status: data.status,
  };
}

// ---------------------------------------------------------------------------
// GetMixSessionStatus Use Case (Supabase-backed)
// Maps to: backend/src/modules/mix-session/application/use-cases/get-mix-session-status.usecase.ts
// ---------------------------------------------------------------------------

export interface GetMixSessionStatusRequest {
  sessionId: string;
}

export interface GetMixSessionStatusResponse {
  sessionId: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = "SessionNotFoundError";
  }
}

export async function getMixSessionStatus(
  request: GetMixSessionStatusRequest,
  supabase: SupabaseClient,
): Promise<GetMixSessionStatusResponse> {
  const { data, error } = await supabase
    .from("mix_sessions")
    .select("id, status, expires_at, created_at")
    .eq("id", request.sessionId)
    .single();

  if (error || !data) throw new SessionNotFoundError(request.sessionId);

  const isExpired = new Date(data.expires_at) < new Date();
  const effectiveStatus = isExpired ? "expired" : data.status;

  // Lazily persist expired state (best-effort)
  if (isExpired && data.status !== "expired") {
    supabase
      .from("mix_sessions")
      .update({ status: "expired" })
      .eq("id", request.sessionId)
      .then(() => {})
      .catch(() => {});
  }

  return {
    sessionId: data.id,
    status: effectiveStatus,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
  };
}

// ---------------------------------------------------------------------------
// CleanupExpiredSessions Use Case (Supabase-backed)
// Maps to: backend/src/modules/mix-session/application/use-cases/cleanup-expired-sessions.usecase.ts
// ---------------------------------------------------------------------------

export interface CleanupResult {
  expiredSessions: number;
  deletedRateLimits: number;
  timestamp: string;
}

export async function cleanupExpiredSessions(supabase: SupabaseClient): Promise<CleanupResult> {
  const now = new Date().toISOString();

  const { count: expiredSessions } = await supabase
    .from("mix_sessions")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("expires_at", now)
    .select("*", { count: "exact", head: true });

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: deletedRateLimits } = await supabase
    .from("rate_limits")
    .delete()
    .lt("created_at", oneHourAgo)
    .select("*", { count: "exact", head: true });

  return {
    expiredSessions: expiredSessions ?? 0,
    deletedRateLimits: deletedRateLimits ?? 0,
    timestamp: now,
  };
}

// ---------------------------------------------------------------------------
// SubmitContactMessage Use Case (Supabase-backed)
// Maps to: backend/src/modules/contact/application/use-cases/submit-contact-message.usecase.ts
// ---------------------------------------------------------------------------

const TICKET_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateTicketId(): string {
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return "TKT-" + Array.from(array, (b) => TICKET_CHARSET[b % TICKET_CHARSET.length]).join("");
}

function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/\0/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s{3,}/g, "  ");
}

export interface SubmitContactRequest {
  subject: string;
  message: string;
  replyContact?: string;
  ipHash: string;
}

export interface SubmitContactResponse {
  ticketId: string;
  createdAt: string;
}

export async function submitContactMessage(
  request: SubmitContactRequest,
  supabase: SupabaseClient,
): Promise<SubmitContactResponse> {
  const ticketId = generateTicketId();

  const { data, error } = await supabase
    .from("contact_tickets")
    .insert({
      ticket_id: ticketId,
      subject: sanitizeInput(request.subject),
      message: sanitizeInput(request.message),
      reply_contact: request.replyContact ? sanitizeInput(request.replyContact) : null,
      ip_hash: request.ipHash,
    })
    .select("ticket_id, created_at")
    .single();

  if (error || !data) throw new Error("DB error creating ticket");

  return { ticketId: data.ticket_id, createdAt: data.created_at };
}

// ---------------------------------------------------------------------------
// GetSystemHealth Use Case
// Maps to: backend/src/modules/health/application/use-cases/get-system-health.usecase.ts
// ---------------------------------------------------------------------------

export interface SystemHealthResponse {
  status: "ok" | "degraded" | "error";
  version: string;
  uptimeSeconds: number;
  timestamp: string;
}

const START_TIME = Date.now();
const APP_VERSION = "1.0.0";

export function getSystemHealth(): SystemHealthResponse {
  return {
    status: "ok",
    version: APP_VERSION,
    uptimeSeconds: Math.round((Date.now() - START_TIME) / 1000),
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Container factory — call once per request
// ---------------------------------------------------------------------------

export interface EdgeContainer {
  supabase: SupabaseClient;
  checkRateLimit: (ipHash: string, config: RateLimitConfig) => Promise<RateLimitResult>;
  recordRateLimit: (ipHash: string, endpoint: string) => Promise<void>;
  createMixSession: (req: CreateMixSessionRequest) => Promise<CreateMixSessionResponse>;
  getMixSessionStatus: (req: GetMixSessionStatusRequest) => Promise<GetMixSessionStatusResponse>;
  cleanupExpiredSessions: () => Promise<CleanupResult>;
  submitContactMessage: (req: SubmitContactRequest) => Promise<SubmitContactResponse>;
  getSystemHealth: () => SystemHealthResponse;
  hashString: (input: string) => Promise<string>;
}

export function getContainer(): EdgeContainer {
  const supabase = getSupabaseClient();
  return {
    supabase,
    checkRateLimit: (ipHash, config) => checkRateLimit(ipHash, config, supabase),
    recordRateLimit: (ipHash, endpoint) => recordRateLimit(ipHash, endpoint, supabase),
    createMixSession: (req) => createMixSession(req, supabase),
    getMixSessionStatus: (req) => getMixSessionStatus(req, supabase),
    cleanupExpiredSessions: () => cleanupExpiredSessions(supabase),
    submitContactMessage: (req) => submitContactMessage(req, supabase),
    getSystemHealth,
    hashString,
  };
}

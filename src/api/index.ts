/**
 * Public API surface for the src/api layer.
 *
 * Import from "@/api" in application code:
 *   import { createMixSession, createContactTicket, getHealthStatus } from "@/api";
 */

export type { ApiErrorDetail, ApiResponse } from "./types";
export { callFunction } from "./client";

export type {
  MixSessionResponse,
  SessionStatusResponse,
} from "./endpoints/mix";
export { createMixSession, getMixSessionStatus } from "./endpoints/mix";

export type { ContactPayload, ContactResponse } from "./endpoints/contact";
export { createContactTicket } from "./endpoints/contact";

export type { HealthResponse } from "./endpoints/health";
export { getHealthStatus } from "./endpoints/health";

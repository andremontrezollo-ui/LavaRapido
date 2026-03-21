/**
 * @deprecated Import from "@/api" instead.
 *
 * This file is kept for backward compatibility only.
 * The canonical API client lives in src/api/.
 */

export type { ApiErrorDetail } from "@/api";
export type { MixSessionResponse, SessionStatusResponse } from "@/api";
export type { ContactResponse } from "@/api";
export type { HealthResponse } from "@/api";
export { createMixSession, getMixSessionStatus, createContactTicket, getHealthStatus } from "@/api";

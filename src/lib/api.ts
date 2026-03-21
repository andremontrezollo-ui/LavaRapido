/**
 * @deprecated Import directly from `@/services/backend-client` instead.
 *
 * This file exists purely as a backward-compatibility shim.  All real
 * implementation lives in `src/services/backend-client.ts`.
 */

export type {
  ApiError as ApiErrorDetail,
  ApiResult as ApiResponse,
  ContactResponse,
  HealthResponse,
} from "@/services/backend-client";

export type { MixSessionResponse, MixSessionStatusResponse as SessionStatusResponse } from "@/contracts/mix-session";

export {
  createMixSession,
  getMixSessionStatus,
  createContactTicket,
  getHealthStatus,
} from "@/services/backend-client";

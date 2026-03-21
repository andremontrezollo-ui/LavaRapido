/**
 * @deprecated Use `@/test/fixtures/mock-session` directly.
 *
 * Backward-compatibility shim so existing test imports keep working.
 */

export type { MixSession } from "@/test/fixtures/mock-session";
export {
  generateMockTestnetAddress,
  generateSessionId,
  createMockSession,
  fromApiResponse,
} from "@/test/fixtures/mock-session";

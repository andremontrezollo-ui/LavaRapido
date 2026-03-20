/**
 * @deprecated
 * The `MixSession` type has moved to `@/lib/session.types`.
 * The mock generators have moved to `@/test/mock-session`.
 *
 * This file exists only to avoid breaking existing imports during migration.
 * Prefer importing directly from the canonical locations.
 */

export type { MixSession } from "@/lib/session.types";
export { generateMockTestnetAddress, generateSessionId, createMockSession } from "@/test/mock-session";


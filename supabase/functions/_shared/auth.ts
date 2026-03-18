/**
 * Auth Utilities for Edge Functions
 *
 * TODO: Implement JWT / Supabase auth validation when user authentication is required.
 * Currently, Edge Functions operate in service-role mode (no user auth).
 */

export interface AuthContext {
  /** Whether the request carries a valid auth token. */
  authenticated: boolean;
  /** The user ID extracted from the token, if present. */
  userId?: string;
}

/**
 * Stub: returns an unauthenticated context.
 * Replace with real JWT validation if user authentication is needed.
 */
export function extractAuthContext(_req: Request): AuthContext {
  return { authenticated: false };
}

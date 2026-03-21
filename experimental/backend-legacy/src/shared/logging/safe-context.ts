/**
 * Safe Context Builder — filters and redacts context objects before logging.
 */

import type { RedactionPolicy } from './redaction-policy';

export function buildSafeContext(
  context: Record<string, unknown>,
  policy: RedactionPolicy,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (value === undefined || value === null) continue;
    safe[key] = policy.redactValue(key, value);
  }
  return safe;
}

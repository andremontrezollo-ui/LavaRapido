/**
 * Input sanitizer — strips control characters and normalizes whitespace.
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/\0/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s{3,}/g, "  ");
}

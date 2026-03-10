/**
 * Secure Headers Middleware — sets security headers on HTTP responses.
 * Includes: X-Content-Type-Options, CSP, HSTS, and other OWASP-recommended headers.
 */

export interface SecureHeadersOptions {
  hsts?: boolean;
  csp?: string;
}

export const DEFAULT_SECURE_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
};

export class SecureHeadersMiddleware {
  private readonly headers: Record<string, string>;

  constructor(options: SecureHeadersOptions = {}) {
    this.headers = { ...DEFAULT_SECURE_HEADERS };

    if (options.hsts === false) {
      delete this.headers['Strict-Transport-Security'];
    }

    if (options.csp) {
      this.headers['Content-Security-Policy'] = options.csp;
    }
  }

  getHeaders(): Record<string, string> {
    return { ...this.headers };
  }

  /**
   * Apply headers to a generic response object with setHeader() method.
   */
  apply(res: { setHeader(name: string, value: string): void }): void {
    for (const [name, value] of Object.entries(this.headers)) {
      res.setHeader(name, value);
    }
  }
}

/**
 * JWT Verifier — creates and validates HS256 JSON Web Tokens.
 */

import { createHmac, timingSafeEqual } from 'crypto';

export interface JwtPayload {
  sub: string;
  email?: string;
  roles?: string[];
  scopes?: string[];
  iat: number;
  exp: number;
}

export interface JwtVerifyResult {
  valid: boolean;
  payload?: JwtPayload;
  reason?: string;
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(data: string): string {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/');
  const paddingNeeded = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(paddingNeeded), 'base64').toString('utf-8');
}

export class JwtVerifier {
  private readonly algorithm = 'HS256';
  private readonly header: string;

  constructor(
    private readonly secret: string,
    private readonly defaultExpirySeconds: number = 3600,
  ) {
    this.header = base64UrlEncode(JSON.stringify({ alg: this.algorithm, typ: 'JWT' }));
  }

  create(payload: Omit<JwtPayload, 'iat' | 'exp'>, expirySeconds?: number): string {
    const now = Math.floor(Date.now() / 1000);
    const ttl = expirySeconds ?? this.defaultExpirySeconds;
    const full: JwtPayload = { ...payload, iat: now, exp: now + ttl };
    const body = base64UrlEncode(JSON.stringify(full));
    const signingInput = `${this.header}.${body}`;
    const signature = this.sign(signingInput);
    return `${signingInput}.${signature}`;
  }

  verify(token: string): JwtVerifyResult {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Malformed token' };
    }

    const [headerB64, bodyB64, sigB64] = parts;
    const signingInput = `${headerB64}.${bodyB64}`;
    const expectedSig = this.sign(signingInput);

    if (!this.timingSafeCompare(expectedSig, sigB64)) {
      return { valid: false, reason: 'Invalid signature' };
    }

    let payload: JwtPayload;
    try {
      payload = JSON.parse(base64UrlDecode(bodyB64)) as JwtPayload;
    } catch {
      return { valid: false, reason: 'Malformed payload' };
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp !== undefined && payload.exp < now) {
      return { valid: false, reason: 'Token expired' };
    }

    return { valid: true, payload };
  }

  private sign(input: string): string {
    return createHmac('sha256', this.secret).update(input).digest('base64url');
  }

  private timingSafeCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a);
      const bufB = Buffer.from(b);
      if (bufA.length !== bufB.length) return false;
      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}

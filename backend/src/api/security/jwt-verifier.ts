/**
 * JWT Verifier — validates JWTs with strong security controls.
 *
 * Features:
 * - Expiration validation with configurable clock skew
 * - Issuer validation
 * - Audience validation
 * - Algorithm pinning (HS256 only)
 * - Key rotation support via key resolver
 * - Explicit distinction between authentication and authorization errors
 */

import * as jwt from 'jsonwebtoken';

export type JwtAlgorithm = 'HS256' | 'HS384' | 'HS512';

export interface JwtClaims {
  sub: string;
  iss: string;
  aud: string | string[];
  iat: number;
  exp: number;
  scope?: string;
  roles?: string[];
  jti?: string;
}

export interface JwtVerifierOptions {
  /** Allowed issuers. Token iss must match one of these. */
  issuers: string[];
  /** Allowed audiences. Token aud must overlap with this list. */
  audiences: string[];
  /** Maximum clock skew in seconds (default: 30). */
  clockSkewSeconds?: number;
  /** Allowed algorithms (default: ['HS256']). */
  algorithms?: JwtAlgorithm[];
}

export type JwtVerifyResult =
  | { ok: true; claims: JwtClaims }
  | { ok: false; reason: string; code: 'EXPIRED' | 'INVALID_SIGNATURE' | 'INVALID_ISSUER' | 'INVALID_AUDIENCE' | 'MALFORMED' | 'REVOKED' };

/** Resolves the secret/public key for a given kid (key ID). */
export type KeyResolver = (kid: string | undefined) => string | Buffer | null;

/** Hook called after each verification — implement for token revocation checks. */
export interface RevocationHook {
  isRevoked(jti: string): Promise<boolean>;
}

export class JwtVerifier {
  private readonly clockSkewSeconds: number;
  private readonly algorithms: JwtAlgorithm[];

  constructor(
    private readonly keyResolver: KeyResolver,
    private readonly options: JwtVerifierOptions,
    private readonly revocationHook: RevocationHook | null = null,
  ) {
    this.clockSkewSeconds = options.clockSkewSeconds ?? 30;
    this.algorithms = options.algorithms ?? ['HS256'];
  }

  async verify(token: string): Promise<JwtVerifyResult> {
    // 1. Decode header to extract kid before verification
    let decoded: jwt.Jwt | null = null;
    try {
      decoded = jwt.decode(token, { complete: true });
    } catch {
      return { ok: false, reason: 'Malformed JWT', code: 'MALFORMED' };
    }

    if (!decoded) {
      return { ok: false, reason: 'Malformed JWT', code: 'MALFORMED' };
    }

    const kid = (decoded.header as any).kid as string | undefined;
    const secret = this.keyResolver(kid);
    if (!secret) {
      return { ok: false, reason: 'No key available for kid', code: 'INVALID_SIGNATURE' };
    }

    // 2. Verify signature, expiration, algorithm
    let claims: JwtClaims;
    try {
      claims = jwt.verify(token, secret, {
        algorithms: this.algorithms,
        clockTolerance: this.clockSkewSeconds,
        ignoreExpiration: false,
      }) as JwtClaims;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return { ok: false, reason: 'Token has expired', code: 'EXPIRED' };
      }
      if (err instanceof jwt.JsonWebTokenError) {
        return { ok: false, reason: `Invalid token: ${err.message}`, code: 'INVALID_SIGNATURE' };
      }
      return { ok: false, reason: 'Token verification failed', code: 'MALFORMED' };
    }

    // 3. Validate issuer
    if (!this.options.issuers.includes(claims.iss)) {
      return {
        ok: false,
        reason: `Untrusted issuer: ${claims.iss}`,
        code: 'INVALID_ISSUER',
      };
    }

    // 4. Validate audience
    const tokenAud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const audienceMatch = this.options.audiences.some(a => tokenAud.includes(a));
    if (!audienceMatch) {
      return {
        ok: false,
        reason: `Token audience does not match: ${tokenAud.join(', ')}`,
        code: 'INVALID_AUDIENCE',
      };
    }

    // 5. Revocation check (if hook provided)
    if (this.revocationHook && claims.jti) {
      const revoked = await this.revocationHook.isRevoked(claims.jti);
      if (revoked) {
        return { ok: false, reason: 'Token has been revoked', code: 'REVOKED' };
      }
    }

    return { ok: true, claims };
  }
}

/**
 * Build a simple static key resolver for single-key deployments.
 * For key rotation, use a map of kid → key.
 */
export function buildStaticKeyResolver(secret: string): KeyResolver {
  return (_kid) => secret;
}

/**
 * Build a key resolver that supports multiple keys identified by kid.
 * Keys without a kid fall back to the defaultKey if provided.
 */
export function buildRotatingKeyResolver(
  keys: Record<string, string>,
  defaultKey?: string,
): KeyResolver {
  return (kid) => {
    if (kid && keys[kid]) return keys[kid];
    if (defaultKey) return defaultKey;
    return null;
  };
}

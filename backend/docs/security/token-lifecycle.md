# Token Lifecycle — Security Documentation

**Version:** 1.0  
**Last Updated:** 2026-03-10  
**Status:** Production

---

## Overview

This document describes the complete lifecycle of authentication tokens used by the LavaRapido backend. It covers issuance, validation, expiration, rotation, revocation, and operational recommendations.

---

## Authentication Models

The backend supports two authentication modes:

| Mode | Token Type | Used By |
|------|-----------|---------|
| Service-role key | Static shared secret (Bearer) | Internal services, cronjobs, infra |
| JWT Bearer | Signed JSON Web Token | External clients (future) |

The `AuthService` handles both modes transparently. The authorization layer (`AuthorizationPolicy`) evaluates scopes and roles independently of how the identity was established.

---

## 1. Token Issuance

### Service-Role Key
- Issued out-of-band (environment variable `SUPABASE_SERVICE_ROLE_KEY`)
- Not time-limited by the application layer
- Rotation must be done manually (see [Key Rotation](#5-key-rotation))
- Never expose in logs, responses, or client-facing APIs

### JWT
- Issued by a trusted identity provider (IdP) or the backend itself
- Required claims: `sub`, `iss`, `aud`, `iat`, `exp`
- Optional claims: `scope`, `roles`, `jti` (for revocation)
- Algorithm: **HS256** (or HS384/HS512) — no RSA yet; symmetric key for single-service deployment
- Signed with a secret resolved by `KeyResolver` (supports key-id `kid` in header)

**Example JWT payload:**
```json
{
  "sub": "user-123",
  "iss": "https://lava-rapido.example.com",
  "aud": "lava-rapido-api",
  "iat": 1710000000,
  "exp": 1710003600,
  "scope": "anon",
  "roles": [],
  "jti": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 2. Expiration

| Token | Default TTL | Configurable |
|-------|------------|-------------|
| Service-role key | Indefinite | Manual rotation |
| JWT | Set by issuer | Yes (recommended: 1h) |

- The `JwtVerifier` enforces expiration strictly using `jsonwebtoken` library
- Clock skew tolerance: **30 seconds** (configurable via `clockSkewSeconds`)
- Expired tokens always return `code: 'EXPIRED'` — never silently accept them

### Recommended JWT TTL

| Scenario | Recommended TTL |
|----------|----------------|
| User session | 1 hour |
| Machine-to-machine | 5 minutes |
| Admin actions | 15 minutes |

---

## 3. Refresh Token Decision

**This system does not implement refresh tokens.**

**Rationale:**  
- The primary auth mode is service-role key (static, for internal services)
- End-user JWT support is future scope
- Refresh tokens add state (revocation store) and complexity without benefit at current scale
- Short-lived JWTs (1h) are the recommended mitigation for the lack of refresh tokens

**If refresh tokens are added in the future:**
- Issue refresh tokens separately with longer TTL (e.g., 30 days)
- Store refresh token hashes in a persistent revocation-capable store (Redis or PostgreSQL)
- Implement the `RevocationHook` interface in `jwt-verifier.ts`
- Bind refresh token issuance to session ID for auditability

---

## 4. Validation

Every incoming request passes through `AuthService.authenticate()`. The following checks are performed in order:

1. **Header presence** — `Authorization: Bearer <token>` must be present
2. **Format check** — must be exactly `Bearer <token>`
3. **Service-role key check** — constant-time comparison against env var
4. **JWT verification** (if configured):
   - Signature verification with resolved key
   - Algorithm pinning (HS256 only by default)
   - Expiration check with clock skew tolerance
   - Issuer validation against `issuers` allowlist
   - Audience validation against `audiences` allowlist
   - Revocation check via `RevocationHook` (if configured)

**Failure codes returned by `AuthService`:**

| Code | Meaning |
|------|---------|
| `MISSING_CREDENTIALS` | No Authorization header |
| `EXPIRED` | Token has expired |
| `INVALID` | Bad signature, wrong issuer/audience, malformed |
| `REVOKED` | Token explicitly revoked |

---

## 5. Key Rotation

### Service-Role Key Rotation
1. Generate a new strong secret: `openssl rand -hex 32`
2. Update `SUPABASE_SERVICE_ROLE_KEY` in all deployment environments
3. Restart the application (zero-downtime: deploy new version before revoking old key)
4. Revoke old key in the identity provider or secret manager

### JWT Signing Key Rotation (when JWT is enabled)
The `JwtVerifier` supports key rotation via the `kid` (Key ID) header:

1. Add the new key to the `KeyResolver` map with a new `kid`
2. Configure the IdP to sign new tokens with the new `kid`
3. Keep the old key in the resolver until all old tokens expire
4. Remove the old key once its maximum TTL has passed

**Example using `buildRotatingKeyResolver`:**
```typescript
const verifier = new JwtVerifier(
  buildRotatingKeyResolver({
    'key-v1': process.env.JWT_SECRET_V1!,
    'key-v2': process.env.JWT_SECRET_V2!,  // new key
  }),
  options,
);
```

---

## 6. Revocation

The `RevocationHook` interface enables token revocation:

```typescript
export interface RevocationHook {
  isRevoked(jti: string): Promise<boolean>;
}
```

**Current status:** No revocation store is implemented.  
JTI-based revocation requires a persistent store (Redis recommended for speed).

**To implement revocation:**
1. Create a `RedisRevocationStore` implementing `RevocationHook`
2. Inject it into `JwtVerifier` constructor
3. Store revoked JTIs with TTL equal to token expiry
4. Call `isRevoked(jti)` on every token verification

---

## 7. Expected Failures and Responses

| Failure | HTTP Status | Response |
|---------|------------|---------|
| Missing credentials | 401 | `{"error": "Missing Authorization header"}` |
| Expired token | 401 | `{"error": "Token has expired"}` |
| Invalid token | 401 | `{"error": "Invalid token"}` |
| Revoked token | 401 | `{"error": "Token has been revoked"}` |
| Insufficient scope | 403 | `{"error": "Scope not permitted"}` |
| Missing role | 403 | `{"error": "Missing required role"}` |

Authentication failures (401) vs authorization failures (403) are explicitly distinguished.

---

## 8. Operational Recommendations

1. **Rotate service-role keys every 90 days** (or immediately after suspected exposure)
2. **Use JWT `jti` claim** for all tokens if revocation is a requirement
3. **Set JWT TTL to ≤ 1 hour** for user-facing tokens
4. **Never log raw tokens** — the `SecureLogger` with `DefaultRedactionPolicy` will redact `Authorization` headers
5. **Monitor 401/403 rates** — sudden spikes indicate either an attack or a misconfigured deployment
6. **Use HTTPS only in production** — tokens in transit must be protected by TLS
7. **Key material must not be in source code** — always use environment variables or a secrets manager
8. **Clock synchronization** — ensure all nodes use NTP to prevent clock skew issues

---

## 9. Security Boundary Summary

```
Request
  │
  ├─ AuthService.authenticate()      ← authentication (who are you?)
  │     ├─ service-role key check
  │     └─ JwtVerifier.verify()
  │           ├─ signature
  │           ├─ expiration
  │           ├─ issuer
  │           ├─ audience
  │           └─ revocation hook
  │
  └─ AuthorizationPolicy.authorize() ← authorization (are you allowed?)
        ├─ scope check
        └─ role check
```

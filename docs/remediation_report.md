# Remediation Report

**Repository:** `andremontrezollo-ui/bankround1`  
**Date:** 2026-03-16  
**Scope:** Full security hardening, configuration hygiene, and UX transparency audit

---

## Summary

This report documents all changes made during the security and quality audit of the
`bankround1` repository. The goal was to harden security, fix configuration hygiene,
align frontend/backend, and enforce honest "demo/simulator" framing throughout the UI.

---

## Files Changed

### Configuration / Root
| File | Change |
|---|---|
| `.gitignore` | Added `.env`, `.env.local`, `.env.production`, `.env.staging`, `bun.lock`, `bun.lockb` |
| `.env` | **Removed from git tracking** (`git rm --cached`) — was versionated with real Supabase keys |
| `.env.example` | **Created** — placeholder-only file with documentation; no real secrets |
| `package.json` | Added `"typecheck": "tsc --noEmit"` script |
| `README.md` | **Complete rewrite** — removed "mixing service" language; added demo disclaimer, env var docs, setup guide, Supabase local/remote instructions, security overview |

### Frontend — Source
| File | Change |
|---|---|
| `src/main.tsx` | Added startup validation: app shows friendly error if `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` are missing |
| `src/integrations/supabase/client.ts` | Changed to `persistSession: false`, `autoRefreshToken: false` (demo app has no auth); typed env vars |
| `src/lib/api.ts` | Added `statusToken` to `MixSessionResponse`; `SessionStatusResponse` no longer returns `sessionId`; `getMixSessionStatus()` now accepts `statusToken` (opaque token) instead of UUID |
| `src/lib/mock-session.ts` | Added `statusToken: string` field to `MixSession` interface |
| `src/pages/MixingPage.tsx` | Updated header/text to "Simulator Configuration"; warning box changed from "Irreversible Operation" to "Demo/Simulator only"; destination addresses labelled as demo; statusToken wired into session state |
| `src/pages/FAQ.tsx` | **Full rewrite of FAQ content** — removed real-service language; replaced with honest simulator/prototype Q&A |
| `src/pages/HowItWorks.tsx` | Updated hero text and all 4 flow steps to simulator language; CTA buttons updated |
| `src/components/home/HeroSection.tsx` | Replaced "breaking traceability" language with simulator/demo framing; added warning badge; CTA changed from "Start operation" to "Try the simulator" |
| `src/components/home/TransparencySection.tsx` | Rewrote "What we do/don't do" to "What this simulator does/does NOT do" |
| `src/components/home/TrustIndicators.tsx` | Rewrote indicators for simulator design principles |
| `src/components/mixing/ConfirmationSummary.tsx` | Title → "Simulation Summary"; address label → "Simulated destination addresses (demo only)"; confirm button → "Confirm Simulation" |
| `src/components/mixing/DepositInfo.tsx` | Title → "Demo Session Created"; removed real-fund "Next steps" text; shows `statusToken` prefix (not internal UUID); "New Operation" → "New Simulation" |

### Supabase Edge Functions
| File | Change |
|---|---|
| `supabase/functions/_shared/security-headers.ts` | **Removed `Access-Control-Allow-Origin: *`**; replaced with origin allowlist via `ALLOWED_ORIGIN` env var; `jsonResponse()` and `corsResponse()` now accept `requestOrigin` parameter; added `Vary: Origin` |
| `supabase/functions/_shared/rate-limiter.ts` | **Replaced `hashString()` (plain SHA-256) with `hashIp()` (HMAC-SHA256)**; uses `RATE_LIMIT_HMAC_SECRET` env var; falls back to plain SHA-256 with warning if secret not set |
| `supabase/functions/mix-sessions/index.ts` | Updated to use `hashIp()` instead of `hashString()`; generates `public_status_token` (32 random bytes hex); inserts token into DB; returns `statusToken` in response |
| `supabase/functions/mix-session-status/index.ts` | **Replaced UUID-based lookup with opaque token lookup** (`public_status_token`); validates 64-char hex format; returns only `status`, `expiresAt`, `createdAt` — no internal ID; passes `requestOrigin` to CORS helpers |
| `supabase/functions/contact/index.ts` | Updated to use `hashIp()`; passes `requestOrigin` to CORS helpers |
| `supabase/functions/health/index.ts` | Passes `requestOrigin` to CORS helpers |
| `supabase/functions/cleanup/index.ts` | **Added deletion of `mix_sessions` older than 24 hours** and `contact_tickets` older than 7 days; logs new counts; passes `requestOrigin` to CORS helpers |

### Supabase Migrations
| File | Change |
|---|---|
| `supabase/migrations/20260316000001_opaque_status_token.sql` | **New migration**: (1) drops `"Anyone can read mix sessions"` public SELECT policy; (2) adds `public_status_token text NOT NULL UNIQUE` column with backfill using `gen_random_bytes(32)`; (3) creates unique index; (4) deletes old sessions older than 24 hours; (5) deletes old contact tickets older than 7 days |

### Documentation
| File | Change |
|---|---|
| `docs/data-retention.md` | **New file** — documents retention periods for all tables, IP pseudonymisation approach, cleanup schedule, data not collected |
| `docs/remediation_report.md` | **This file** |

---

## Migrations Created

| Migration | Purpose |
|---|---|
| `20260316000001_opaque_status_token.sql` | Remove public SELECT policy; add opaque `public_status_token` column; backfill; unique index; initial data cleanup |

---

## Problems Corrected

| # | Problem | Severity | Fix Applied |
|---|---|---|---|
| 1 | `.env` with real Supabase keys committed to git | High | Removed from git; added to `.gitignore`; created `.env.example` |
| 2 | `mix_sessions` had `SELECT USING (true)` for anon | High | Dropped policy in migration `20260316000001` |
| 3 | Status lookup used internal UUID (`sessionId`) | Medium | Replaced with opaque `public_status_token`; migration adds column |
| 4 | `CORS: Allow-Origin: *` in all Edge Functions | Medium | Replaced with env-based allowlist (`ALLOWED_ORIGIN`) |
| 5 | IP hash used plain SHA-256 (no secret) | Medium | Migrated to HMAC-SHA256 with `RATE_LIMIT_HMAC_SECRET` |
| 6 | Frontend showed `sessionId` (internal UUID) to user | Medium | Now shows `statusToken` prefix (opaque) in DepositInfo |
| 7 | UI/README described real mixing service operations | High | All text updated to simulator/demo/prototype language |
| 8 | No startup validation for missing env vars | Medium | Added startup check in `src/main.tsx` |
| 9 | Supabase client used `persistSession: true` + localStorage | Low | Changed to `persistSession: false, autoRefreshToken: false` |
| 10 | No data retention policy documented | Medium | Created `docs/data-retention.md` |
| 11 | `cleanup` function did not purge old sessions/tickets | Medium | Added 24h session deletion and 7d ticket deletion |
| 12 | `bun.lock` / `bun.lockb` committed alongside `package-lock.json` | Low | Removed from git; added to `.gitignore`; documented npm as canonical PM |
| 13 | README described non-existent env var policy ("no env vars needed") | Medium | README rewritten with accurate env var documentation |
| 14 | `typecheck` script missing from `package.json` | Low | Added `"typecheck": "tsc --noEmit"` |

---

## Acceptance Criteria Status

| Criterion | Status |
|---|---|
| `.env` not versionated as real config | ✅ Fixed |
| `.env.example` exists and is safe | ✅ Created |
| `.gitignore` covers sensitive files | ✅ Updated |
| No public SELECT on `mix_sessions` | ✅ Fixed (migration) |
| Frontend does not query `mix_sessions` directly | ✅ Confirmed (uses Edge Functions) |
| Status flow uses opaque token via Edge Function | ✅ Implemented |
| Frontend shows demo/simulator language | ✅ Fixed across all pages |
| README coherent with real scripts | ✅ Rewritten |
| Package manager standardised (npm) | ✅ Documented; bun lockfiles excluded |
| Edge Functions have restricted CORS | ✅ Via `ALLOWED_ORIGIN` env var |
| Data retention reduced and documented | ✅ Policy in `docs/data-retention.md` |
| Project compiles after changes | ✅ `npm run build` and `tsc --noEmit` pass |
| Remediation report exists | ✅ This document |

---

## Residual Risks

| Risk | Severity | Notes |
|---|---|---|
| `RATE_LIMIT_HMAC_SECRET` not set in deployment | Medium | Falls back to plain SHA-256; operator must configure this |
| `ALLOWED_ORIGIN` not set in deployment | Medium | CORS header not returned; operator must configure; documented in README |
| No automated tests for Edge Functions | Low | Demo scope; Deno test setup not yet included |
| `supabase/migrations` applied order depends on Supabase CLI | Low | New migration assumes prior migrations ran; standard Supabase behaviour |
| Old `.env` content in git history | Low | Anon key is public by design; for a full clean consider `git filter-branch` if needed |

---

*Report generated: 2026-03-16*

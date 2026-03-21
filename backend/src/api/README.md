# backend/src/api — API Abstractions (Domain Library)

## Role

This folder contains **portable TypeScript abstractions** for the API layer:

- `controllers/` — Controller classes (e.g., `HealthController`) that can be unit-tested independently
- `middlewares/` — Middleware classes (auth, rate limit, correlation ID, request logging, authorization)
- `schemas/` — DTO validation schemas — **this is the canonical source of validation rules**
- `security/` — Security utilities (`hashIp`, `SECURITY_HEADERS`)
- `errors/` — Error handler that maps domain errors to HTTP responses

## ⚠️ NOT an HTTP Server

These classes and functions are **not connected to any HTTP server**. They are architectural blueprints and unit-testable components.

The **actual HTTP entry points** are the Supabase Edge Functions in `supabase/functions/`. Those functions implement auth, rate limiting, and validation inline using the Deno-compatible utilities in `supabase/functions/_shared/`.

## Intended Use

When the system evolves to integrate `backend/src/modules/` domain logic with Edge Functions, these controller and middleware abstractions can be imported as Deno-compatible TypeScript modules (with explicit `.ts` path resolution).

## Canonical Validation

`schemas/validation.schemas.ts` contains the canonical validation rules for:
- `validateCreateMixSession` — mix session creation
- `validateContact` — contact ticket submission

Edge Functions implement equivalent validation inline. These must remain consistent.

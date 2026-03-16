-- Migration: Add opaque public_status_token and remove public SELECT on mix_sessions
-- Date: 2026-03-16

-- 1. Remove the public SELECT policy (anyone can read mix sessions)
DROP POLICY IF EXISTS "Anyone can read mix sessions" ON public.mix_sessions;

-- 2. Ensure there is no other permissive SELECT policy for anon
-- (No replacement — status lookups are mediated by Edge Function using service role)

-- 3. Add opaque status lookup token column
ALTER TABLE public.mix_sessions
  ADD COLUMN IF NOT EXISTS public_status_token text;

-- 4. Populate token for any existing rows (backfill with secure random value)
UPDATE public.mix_sessions
  SET public_status_token = encode(gen_random_bytes(32), 'hex')
  WHERE public_status_token IS NULL;

-- 5. Enforce NOT NULL and UNIQUE after backfill
ALTER TABLE public.mix_sessions
  ALTER COLUMN public_status_token SET NOT NULL;

ALTER TABLE public.mix_sessions
  ADD CONSTRAINT mix_sessions_public_status_token_unique UNIQUE (public_status_token);

-- 6. Index for fast lookups by token
CREATE INDEX IF NOT EXISTS idx_mix_sessions_status_token
  ON public.mix_sessions (public_status_token);

-- 7. Delete old mix_sessions data older than 24 hours (demo data retention)
-- Old sessions have no useful function and retain IP-linked fingerprints
DELETE FROM public.mix_sessions
  WHERE created_at < now() - INTERVAL '24 hours';

-- 8. Delete contact_tickets older than 7 days
DELETE FROM public.contact_tickets
  WHERE created_at < now() - INTERVAL '7 days';

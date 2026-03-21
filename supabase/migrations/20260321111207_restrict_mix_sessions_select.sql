-- Restrict mix_sessions SELECT access.
-- The previous policy "Anyone can read mix sessions" used USING (true),
-- allowing any authenticated or anonymous client to read ALL session records.
-- Session status is served exclusively via Edge Functions using service_role,
-- so public SELECT access is not required and must be removed.

DROP POLICY IF EXISTS "Anyone can read mix sessions" ON public.mix_sessions;

-- Block all direct client SELECT — service_role bypasses RLS automatically.
CREATE POLICY "No public read of mix sessions"
  ON public.mix_sessions FOR SELECT
  USING (false);

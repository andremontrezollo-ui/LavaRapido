-- Migration: Tighten mix_sessions RLS
--
-- The previous SELECT policy "Anyone can read mix sessions" (USING (true)) allowed any
-- authenticated or anonymous client to enumerate ALL sessions via the Supabase client
-- library. All legitimate reads are done by Edge Functions using the service role key
-- (which bypasses RLS). Drop the permissive public SELECT policy and replace it with a
-- service_role-scoped one to prevent session enumeration from the client side.

-- Drop the existing open SELECT policy
DROP POLICY IF EXISTS "Anyone can read mix sessions" ON public.mix_sessions;

-- Allow service role (Edge Functions) to read any session
CREATE POLICY "Service role can read mix sessions"
  ON public.mix_sessions FOR SELECT
  TO service_role
  USING (true);

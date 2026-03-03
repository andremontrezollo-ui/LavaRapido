
-- Tighten contact_tickets: drop permissive policy, only allow via service role
DROP POLICY "Service role can manage contact tickets" ON public.contact_tickets;

-- No public access at all - edge functions use service role which bypasses RLS
CREATE POLICY "No public access to contact tickets"
  ON public.contact_tickets FOR ALL
  USING (false)
  WITH CHECK (false);

-- Tighten rate_limits: same approach
DROP POLICY "Service role can manage rate limits" ON public.rate_limits;

CREATE POLICY "No public access to rate limits"
  ON public.rate_limits FOR ALL
  USING (false)
  WITH CHECK (false);

-- Tighten mix_sessions INSERT - only via edge function (service role)
DROP POLICY "Anyone can create mix sessions" ON public.mix_sessions;

CREATE POLICY "No public insert to mix sessions"
  ON public.mix_sessions FOR INSERT
  WITH CHECK (false);

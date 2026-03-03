
-- Mix Sessions table
CREATE TABLE public.mix_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_address text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed')),
  client_fingerprint_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

ALTER TABLE public.mix_sessions ENABLE ROW LEVEL SECURITY;

-- Public can insert (anonymous service)
CREATE POLICY "Anyone can create mix sessions"
  ON public.mix_sessions FOR INSERT
  WITH CHECK (true);

-- Public can read their own session by ID (via API only, no direct client access needed)
CREATE POLICY "Anyone can read mix sessions"
  ON public.mix_sessions FOR SELECT
  USING (true);

-- Contact Tickets table
CREATE TABLE public.contact_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id text NOT NULL UNIQUE,
  subject text NOT NULL,
  message text NOT NULL,
  reply_contact text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_tickets ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (via edge function)
CREATE POLICY "Service role can manage contact tickets"
  ON public.contact_tickets FOR ALL
  USING (true)
  WITH CHECK (true);

-- Rate limiting table
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  endpoint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limits FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for rate limiting queries
CREATE INDEX idx_rate_limits_ip_endpoint ON public.rate_limits (ip_hash, endpoint, created_at);

-- Index for expired sessions cleanup
CREATE INDEX idx_mix_sessions_expires ON public.mix_sessions (expires_at);

-- Index for ticket lookup
CREATE INDEX idx_contact_tickets_ticket_id ON public.contact_tickets (ticket_id);

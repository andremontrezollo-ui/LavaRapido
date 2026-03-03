import "https://deno.land/std@0.224.0/dotenv/load.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const BASE = `${SUPABASE_URL}/functions/v1`;

Deno.test("POST /contact - valid payload returns 201 with ticketId", async () => {
  const res = await fetch(`${BASE}/contact`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      subject: "Test subject here",
      message: "This is a test message with enough characters to pass validation.",
      replyContact: "test@example.com",
    }),
  });
  const body = await res.json();
  console.log("contact 201:", body);
  if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(body)}`);
  if (!body.ticketId || !body.ticketId.startsWith("TKT-")) throw new Error("Missing/invalid ticketId");
  if (!body.createdAt) throw new Error("Missing createdAt");
});

Deno.test("POST /contact - invalid payload returns 400", async () => {
  const res = await fetch(`${BASE}/contact`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ subject: "", message: "short" }),
  });
  const body = await res.json();
  console.log("contact 400:", body);
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  if (!body.error) throw new Error("Missing error message");
});

Deno.test("POST /mix-sessions - returns 201 with session data", async () => {
  const res = await fetch(`${BASE}/mix-sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
  });
  const body = await res.json();
  console.log("mix-sessions 201:", body);
  if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(body)}`);
  if (!body.sessionId) throw new Error("Missing sessionId");
  if (!body.depositAddress || !body.depositAddress.startsWith("tb1q")) throw new Error("Missing/invalid depositAddress");
  if (!body.expiresAt) throw new Error("Missing expiresAt");

  // Verify TTL is ~30 minutes
  const created = new Date(body.createdAt).getTime();
  const expires = new Date(body.expiresAt).getTime();
  const diffMin = (expires - created) / 60000;
  if (diffMin < 29 || diffMin > 31) throw new Error(`TTL should be ~30min, got ${diffMin}min`);
});

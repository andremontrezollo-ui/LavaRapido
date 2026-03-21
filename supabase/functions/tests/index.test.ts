import "https://deno.land/std@0.224.0/dotenv/load.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_ANON_KEY")!;

const BASE = `${SUPABASE_URL}/functions/v1`;

// --- Contact Tests ---

Deno.test("POST /contact - valid payload returns 201 with ticketId", async () => {
  const res = await fetch(`${BASE}/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({
      subject: "Test subject here",
      message: "This is a test message with enough characters to pass validation.",
      replyContact: "test@example.com",
    }),
  });
  const body = await res.json();
  if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(body)}`);
  if (!body.ticketId?.startsWith("TKT-")) throw new Error("Missing/invalid ticketId");
  if (!body.createdAt) throw new Error("Missing createdAt");
});

Deno.test("POST /contact - invalid payload returns 400 with error code", async () => {
  const res = await fetch(`${BASE}/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ subject: "", message: "short" }),
  });
  const body = await res.json();
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  if (!body.error?.code) throw new Error("Missing standardized error code");
  if (body.error.code !== "VALIDATION_ERROR") throw new Error(`Expected VALIDATION_ERROR, got ${body.error.code}`);
});

// --- Mix Sessions Tests ---

Deno.test("POST /mix-sessions - returns 201 with session data", async () => {
  const res = await fetch(`${BASE}/mix-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
  });
  const body = await res.json();
  if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(body)}`);
  if (!body.sessionId) throw new Error("Missing sessionId");
  if (!body.depositAddress?.startsWith("tb1q")) throw new Error("Missing/invalid depositAddress");
  if (!body.expiresAt) throw new Error("Missing expiresAt");

  // Verify TTL is ~30 minutes
  const created = new Date(body.createdAt).getTime();
  const expires = new Date(body.expiresAt).getTime();
  const diffMin = (expires - created) / 60000;
  if (diffMin < 29 || diffMin > 31) throw new Error(`TTL should be ~30min, got ${diffMin}min`);
});

// --- Session Status Tests ---

Deno.test("POST /mix-session-status - valid session returns 200", async () => {
  // First create a session
  const createRes = await fetch(`${BASE}/mix-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
  });
  const createBody = await createRes.json();
  if (createRes.status !== 201) throw new Error(`Setup failed: ${JSON.stringify(createBody)}`);

  // Then query its status
  const res = await fetch(`${BASE}/mix-session-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ sessionId: createBody.sessionId }),
  });
  const body = await res.json();
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(body)}`);
  if (body.sessionId !== createBody.sessionId) throw new Error("Session ID mismatch");
  if (body.status !== "active") throw new Error(`Expected active, got ${body.status}`);
});

Deno.test("POST /mix-session-status - invalid UUID returns 400", async () => {
  const res = await fetch(`${BASE}/mix-session-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ sessionId: "not-a-uuid" }),
  });
  const body = await res.json();
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  if (body.error?.code !== "VALIDATION_ERROR") throw new Error("Expected VALIDATION_ERROR");
});

Deno.test("POST /mix-session-status - nonexistent session returns 404", async () => {
  const res = await fetch(`${BASE}/mix-session-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ sessionId: "00000000-0000-0000-0000-000000000000" }),
  });
  const body = await res.json();
  if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  if (body.error?.code !== "NOT_FOUND") throw new Error("Expected NOT_FOUND");
});

// --- Health Tests ---

Deno.test("POST /health - returns 200 with status ok", async () => {
  const res = await fetch(`${BASE}/health`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
  });
  const body = await res.json();
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(body)}`);
  if (body.status !== "ok") throw new Error(`Expected ok, got ${body.status}`);
  if (typeof body.uptime !== "number") throw new Error("Missing uptime");
  if (!body.version) throw new Error("Missing version");
});

// --- Security Headers Tests ---

Deno.test("All endpoints return security headers", async () => {
  const endpoints = [
    { url: `${BASE}/health`, method: "POST" },
    { url: `${BASE}/mix-sessions`, method: "POST" },
  ];

  for (const ep of endpoints) {
    const res = await fetch(ep.url, {
      method: ep.method,
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    });
    await res.json(); // consume body

    const requiredHeaders = [
      "x-content-type-options",
      "x-frame-options",
      "referrer-policy",
      "strict-transport-security",
    ];

    for (const header of requiredHeaders) {
      if (!res.headers.get(header)) {
        throw new Error(`Missing security header '${header}' on ${ep.url}`);
      }
    }
  }
});

// --- Error Format Tests ---

Deno.test("Error responses follow standardized format", async () => {
  // Test METHOD_NOT_ALLOWED
  const res = await fetch(`${BASE}/contact`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
  });
  const body = await res.json();
  if (res.status !== 405) throw new Error(`Expected 405, got ${res.status}`);
  if (!body.error?.code) throw new Error("Missing error.code");
  if (!body.error?.message) throw new Error("Missing error.message");
  if (body.error.code !== "METHOD_NOT_ALLOWED") throw new Error(`Expected METHOD_NOT_ALLOWED, got ${body.error.code}`);
});

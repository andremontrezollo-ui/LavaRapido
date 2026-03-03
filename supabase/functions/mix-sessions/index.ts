import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

const TESTNET_CHARSET = "0123456789abcdefghijklmnopqrstuvwxyz";

function generateMockTestnetAddress(): string {
  const body = new Uint8Array(38);
  crypto.getRandomValues(body);
  const encoded = Array.from(body, (b) => TESTNET_CHARSET[b % TESTNET_CHARSET.length]).join("");
  return `tb1q${encoded.slice(0, 38)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Rate limit by IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashString(clientIp);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit: max 10 sessions per 10 minutes per IP
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("endpoint", "mix-sessions")
      .gte("created_at", tenMinAgo);

    if ((count ?? 0) >= 10) {
      return new Response(JSON.stringify({ error: "Too many requests. Try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "600" },
      });
    }

    // Record rate limit hit
    await supabase.from("rate_limits").insert({ ip_hash: ipHash, endpoint: "mix-sessions" });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 min TTL
    const depositAddress = generateMockTestnetAddress();

    const { data, error } = await supabase
      .from("mix_sessions")
      .insert({
        deposit_address: depositAddress,
        status: "active",
        expires_at: expiresAt.toISOString(),
        client_fingerprint_hash: ipHash,
      })
      .select("id, deposit_address, created_at, expires_at, status")
      .single();

    if (error) {
      console.error("DB error:", error);
      return new Response(JSON.stringify({ error: "Failed to create session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        sessionId: data.id,
        depositAddress: data.deposit_address,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
        status: data.status,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

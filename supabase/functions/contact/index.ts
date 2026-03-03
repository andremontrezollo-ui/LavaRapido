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

const VALIDATION = {
  subject: { min: 3, max: 100 },
  message: { min: 10, max: 2000 },
  replyContact: { max: 500 },
};

function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/\0/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s{3,}/g, "  ");
}

function generateTicketId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return "TKT-" + Array.from(array, (b) => chars[b % chars.length]).join("");
}

function validatePayload(body: unknown): { valid: true; data: { subject: string; message: string; replyContact: string } } | { valid: false; error: string } {
  if (!body || typeof body !== "object") return { valid: false, error: "Invalid request body" };
  const { subject, message, replyContact } = body as Record<string, unknown>;

  if (typeof subject !== "string" || subject.trim().length < VALIDATION.subject.min || subject.trim().length > VALIDATION.subject.max) {
    return { valid: false, error: `Subject must be ${VALIDATION.subject.min}-${VALIDATION.subject.max} characters` };
  }
  if (typeof message !== "string" || message.trim().length < VALIDATION.message.min || message.trim().length > VALIDATION.message.max) {
    return { valid: false, error: `Message must be ${VALIDATION.message.min}-${VALIDATION.message.max} characters` };
  }
  if (replyContact !== undefined && replyContact !== "" && typeof replyContact === "string" && replyContact.length > VALIDATION.replyContact.max) {
    return { valid: false, error: `Reply contact must be under ${VALIDATION.replyContact.max} characters` };
  }

  return {
    valid: true,
    data: {
      subject: sanitizeInput(subject as string),
      message: sanitizeInput(message as string),
      replyContact: typeof replyContact === "string" ? sanitizeInput(replyContact) : "",
    },
  };
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
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashString(clientIp);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit: max 5 tickets per 10 minutes per IP
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("endpoint", "contact")
      .gte("created_at", tenMinAgo);

    if ((count ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "600" },
      });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validation = validatePayload(body);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record rate limit
    await supabase.from("rate_limits").insert({ ip_hash: ipHash, endpoint: "contact" });

    const ticketId = generateTicketId();

    const { data, error } = await supabase
      .from("contact_tickets")
      .insert({
        ticket_id: ticketId,
        subject: validation.data.subject,
        message: validation.data.message,
        reply_contact: validation.data.replyContact || null,
        ip_hash: ipHash,
      })
      .select("ticket_id, created_at")
      .single();

    if (error) {
      console.error("DB error:", error);
      return new Response(JSON.stringify({ error: "Failed to create ticket" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ticketId: data.ticket_id,
        createdAt: data.created_at,
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

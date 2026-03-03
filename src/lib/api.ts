/**
 * API client for backend edge functions
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

async function callFunction<T>(functionName: string, body?: unknown): Promise<ApiResponse<T>> {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json();

    if (!res.ok) {
      return { error: json.error || "Unknown error", status: res.status };
    }

    return { data: json as T, status: res.status };
  } catch {
    return { error: "Network error. Please check your connection.", status: 0 };
  }
}

export interface MixSessionResponse {
  sessionId: string;
  depositAddress: string;
  createdAt: string;
  expiresAt: string;
  status: string;
}

export interface ContactResponse {
  ticketId: string;
  createdAt: string;
}

export function createMixSession() {
  return callFunction<MixSessionResponse>("mix-sessions");
}

export function createContactTicket(data: { subject: string; message: string; replyContact?: string }) {
  return callFunction<ContactResponse>("contact", data);
}

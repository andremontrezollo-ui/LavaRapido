/**
 * Contact ticket endpoint.
 */

import { callFunction } from "../client";
import type { ApiResponse } from "../types";

export interface ContactPayload {
  subject: string;
  message: string;
  replyContact?: string;
}

export interface ContactResponse {
  ticketId: string;
  createdAt: string;
}

export function createContactTicket(data: ContactPayload): Promise<ApiResponse<ContactResponse>> {
  return callFunction<ContactResponse>("contact", data);
}

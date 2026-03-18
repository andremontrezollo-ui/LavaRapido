/**
 * Contact API Contracts
 * Defines the stable HTTP request/response shapes for the contact endpoint.
 */

/** POST /contact */
export interface SubmitContactHttpRequest {
  subject: string;
  message: string;
  replyContact?: string;
}

export interface SubmitContactHttpResponse {
  ticketId: string;
  createdAt: string;
}

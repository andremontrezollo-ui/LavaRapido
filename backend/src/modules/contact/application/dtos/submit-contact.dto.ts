/** DTO for SubmitContactMessage input */
export interface SubmitContactRequest {
  subject: string;
  message: string;
  replyContact?: string;
  /** SHA-256 hash of the client IP (for rate limiting & privacy). */
  ipHash: string;
}

/** DTO for SubmitContactMessage output */
export interface SubmitContactResponse {
  ticketId: string;
  createdAt: string;
}

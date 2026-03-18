export const CONTACT_LIMITS = {
  subject: { min: 3, max: 100 },
  message: { min: 10, max: 2000 },
  replyContact: { max: 500 },
};

export interface SubmitContactRequest {
  clientIp: string;
  subject: string;
  message: string;
  replyContact?: string;
}

export interface SubmitContactResponse {
  ticketId: string;
  createdAt: string;
}

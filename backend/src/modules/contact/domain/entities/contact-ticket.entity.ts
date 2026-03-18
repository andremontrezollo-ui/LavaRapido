/**
 * ContactTicket — aggregate root for a support ticket.
 */
export class ContactTicket {
  constructor(
    public readonly ticketId: string,
    public readonly subject: string,
    public readonly message: string,
    public readonly replyContact: string | null,
    public readonly ipHash: string,
    public readonly createdAt: Date,
  ) {}

  /** Generates a human-readable ticket ID like TKT-AB3XYZ. */
  static generateTicketId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const array = new Uint8Array(6);
    crypto.getRandomValues(array);
    return 'TKT-' + Array.from(array, (b) => chars[b % chars.length]).join('');
  }

  /** Sanitize user-supplied text: remove null bytes and dangerous control chars. */
  static sanitize(input: string): string {
    return input
      .trim()
      .replace(/\0/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\s{3,}/g, '  ');
  }
}

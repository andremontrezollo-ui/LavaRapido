/**
 * TicketId Value Object
 * A unique, human-readable support ticket identifier in the format "TKT-XXXXXX".
 */

const TICKET_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class TicketId {
  private constructor(readonly value: string) {}

  static generate(getRandomValues: (arr: Uint8Array) => Uint8Array): TicketId {
    const array = new Uint8Array(6);
    getRandomValues(array);
    const suffix = Array.from(array, (b) => TICKET_CHARSET[b % TICKET_CHARSET.length]).join('');
    return new TicketId(`TKT-${suffix}`);
  }

  static fromStorage(value: string): TicketId {
    return new TicketId(value);
  }

  equals(other: TicketId): boolean {
    return this.value === other.value;
  }
}

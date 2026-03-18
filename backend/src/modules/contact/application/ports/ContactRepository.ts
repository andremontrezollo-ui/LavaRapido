/**
 * ContactRepository — port (interface) for contact-ticket persistence.
 */

import type { ContactTicket } from '../../domain/ContactTicket.ts';

export interface ContactRepository {
  /**
   * Persist a new contact ticket.
   * The implementation is responsible for setting `createdAt`.
   */
  save(ticket: Omit<ContactTicket, 'createdAt'>): Promise<ContactTicket>;
}

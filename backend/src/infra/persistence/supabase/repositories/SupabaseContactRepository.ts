/**
 * SupabaseContactRepository — Node.js implementation.
 *
 * Implements ContactRepository using the Supabase JS client (Node.js).
 * Mirrors the schema of the `contact_tickets` table.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContactTicket } from '../../../../modules/contact/domain/ContactTicket.ts';
import type { ContactRepository } from '../../../../modules/contact/application/ports/ContactRepository.ts';

interface ContactTicketRow {
  ticket_id: string;
  subject: string;
  message: string;
  reply_contact: string | null;
  ip_hash: string;
  created_at: string;
}

function rowToEntity(row: ContactTicketRow): ContactTicket {
  return {
    ticketId: row.ticket_id,
    subject: row.subject,
    message: row.message,
    replyContact: row.reply_contact,
    ipHash: row.ip_hash,
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseContactRepository implements ContactRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async save(ticket: Omit<ContactTicket, 'createdAt'>): Promise<ContactTicket> {
    const { data, error } = await this.supabase
      .from('contact_tickets')
      .insert({
        ticket_id: ticket.ticketId,
        subject: ticket.subject,
        message: ticket.message,
        reply_contact: ticket.replyContact ?? null,
        ip_hash: ticket.ipHash,
      })
      .select('ticket_id, subject, message, reply_contact, ip_hash, created_at')
      .single();

    if (error || !data) throw new Error(`Failed to save contact ticket: ${error?.message}`);
    return rowToEntity(data as ContactTicketRow);
  }
}

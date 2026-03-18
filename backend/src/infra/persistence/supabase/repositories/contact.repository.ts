/**
 * SupabaseContactRepository — Supabase implementation of ContactRepository.
 */
import type { ContactRepository, CreateContactTicketInput } from '../../../modules/contact/application/ports/contact-repository.port.ts';
import { ContactTicket } from '../../../modules/contact/domain/entities/contact-ticket.entity.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export class SupabaseContactRepository implements ContactRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateContactTicketInput): Promise<ContactTicket> {
    const { data, error } = await this.client
      .from('contact_tickets')
      .insert({
        ticket_id: input.ticketId,
        subject: input.subject,
        message: input.message,
        reply_contact: input.replyContact ?? null,
        ip_hash: input.ipHash,
      })
      .select('ticket_id, created_at')
      .single();

    if (error || !data) throw new Error(`Failed to create ticket: ${error?.message}`);

    return new ContactTicket(
      data.ticket_id,
      input.subject,
      input.message,
      input.replyContact ?? null,
      input.ipHash,
      new Date(data.created_at),
    );
  }
}

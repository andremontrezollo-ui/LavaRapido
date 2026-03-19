/**
 * Supabase implementation of ContactRepositoryPort.
 */

import type { SupabaseClient } from "./supabase-client.factory.ts";
import type { ContactRepositoryPort } from "../../../../backend/src/modules/contact/application/ports/contact-repository.port.ts";
import type { ContactTicket } from "../../../../backend/src/modules/contact/domain/entities/contact-ticket.entity.ts";

export class SupabaseContactRepository implements ContactRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(params: {
    ticketId: string;
    subject: string;
    message: string;
    replyContact: string | null;
    ipHash: string;
  }): Promise<ContactTicket> {
    const { data, error } = await this.supabase
      .from("contact_tickets")
      .insert({
        ticket_id: params.ticketId,
        subject: params.subject,
        message: params.message,
        reply_contact: params.replyContact,
        ip_hash: params.ipHash,
      })
      .select("ticket_id, subject, message, reply_contact, ip_hash, created_at")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to create ticket");

    return {
      ticketId: data.ticket_id as string,
      subject: data.subject as string,
      message: data.message as string,
      replyContact: (data.reply_contact as string | null) ?? null,
      ipHash: data.ip_hash as string,
      createdAt: new Date(data.created_at as string),
    };
  }
}

/**
 * Adapter: SupabaseContactRepository
 * Concrete Supabase implementation of ContactRepository.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type {
  ContactRepository,
  ContactTicketRecord,
  CreateContactTicketParams,
} from "../ports/contact-repository.port.ts";

export function createSupabaseContactRepository(
  supabase: ReturnType<typeof createClient>,
): ContactRepository {
  return {
    async create(params: CreateContactTicketParams): Promise<ContactTicketRecord> {
      const { data, error } = await supabase
        .from("contact_tickets")
        .insert({
          ticket_id: params.ticketId,
          subject: params.subject,
          message: params.message,
          reply_contact: params.replyContact,
          ip_hash: params.ipHash,
        })
        .select("ticket_id, created_at")
        .single();

      if (error || !data) throw new Error("DB error creating contact ticket");
      return data as ContactTicketRecord;
    },
  };
}

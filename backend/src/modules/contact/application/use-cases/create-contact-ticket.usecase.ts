import type { ContactRepositoryPort } from '../ports/contact-repository.port.ts';
import type { CreateTicketDto, CreateTicketResultDto } from '../dtos/create-ticket.dto.ts';
import { InvalidContactInputError } from '../../domain/errors/invalid-contact-input.error.ts';
import { CONTACT_VALIDATION } from '../../domain/entities/contact-ticket.entity.ts';
import { generateTicketId } from '../../../../shared/utils/id-generator.ts';
import { sanitizeInput } from '../../../../shared/utils/sanitize.ts';

export class CreateContactTicketUseCase {
  constructor(private readonly tickets: ContactRepositoryPort) {}

  async execute(dto: CreateTicketDto): Promise<CreateTicketResultDto> {
    const subject = dto.subject?.trim() ?? "";
    const message = dto.message?.trim() ?? "";
    const replyContact = typeof dto.replyContact === "string" ? dto.replyContact.trim() : "";

    if (
      subject.length < CONTACT_VALIDATION.subject.min ||
      subject.length > CONTACT_VALIDATION.subject.max
    ) {
      throw new InvalidContactInputError(
        `Subject must be ${CONTACT_VALIDATION.subject.min}-${CONTACT_VALIDATION.subject.max} characters`,
      );
    }

    if (
      message.length < CONTACT_VALIDATION.message.min ||
      message.length > CONTACT_VALIDATION.message.max
    ) {
      throw new InvalidContactInputError(
        `Message must be ${CONTACT_VALIDATION.message.min}-${CONTACT_VALIDATION.message.max} characters`,
      );
    }

    if (replyContact.length > CONTACT_VALIDATION.replyContact.max) {
      throw new InvalidContactInputError(
        `Reply contact must be under ${CONTACT_VALIDATION.replyContact.max} characters`,
      );
    }

    const ticketId = generateTicketId();

    const ticket = await this.tickets.create({
      ticketId,
      subject: sanitizeInput(subject),
      message: sanitizeInput(message),
      replyContact: replyContact ? sanitizeInput(replyContact) : null,
      ipHash: dto.ipHash,
    });

    return {
      ticketId: ticket.ticketId,
      createdAt: ticket.createdAt.toISOString(),
    };
  }
}

/**
 * Contact Presenter
 * Maps use-case output DTOs to stable HTTP response contracts.
 */

import type { SubmitContactResponse } from '../../modules/contact/application/dtos/submit-contact.dto';
import type { SubmitContactHttpResponse } from '../contracts/contact.contracts';

export class ContactPresenter {
  static toSubmitResponse(dto: SubmitContactResponse): SubmitContactHttpResponse {
    return { ticketId: dto.ticketId, createdAt: dto.createdAt };
  }
}

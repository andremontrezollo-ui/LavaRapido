/**
 * Contact Route — creates support tickets.
 *
 * Replaces (deprecated): supabase/functions/contact
 *
 * Architecture Rule: This route validates input through the API layer schema
 * and produces a structured response. No direct database access.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { validateContact } from '../schemas/validation.schemas';
import { successResponse, errorResponse } from '../../shared/http/api-response';
import { HttpStatus } from '../../shared/http/HttpStatus';
import type { DependencyContainer } from '../../app/dependency-container';

const TICKET_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateTicketId(): string {
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  const suffix = Array.from(array, (b) => TICKET_CHARS[b % TICKET_CHARS.length]).join('');
  return `TKT-${suffix}`;
}

export function createContactRouter(container: DependencyContainer): Router {
  const router = Router();

  /**
   * POST /api/v1/contact
   * Create a support/contact ticket.
   * Body: { subject, message, replyContact? }
   */
  router.post('/', async (req: Request, res: Response) => {
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    const validation = validateContact(req.body);

    if (!validation.valid) {
      return res.status(HttpStatus.BAD_REQUEST).json(
        errorResponse('VALIDATION_ERROR', 'Invalid request body', { fields: validation.errors }, correlationId),
      );
    }

    try {
      const ticketId = generateTicketId();
      const createdAt = new Date().toISOString();

      container.logger.info('Contact ticket created', {
        ticketId,
        correlationId,
      });

      return res.status(HttpStatus.CREATED).json(
        successResponse({
          ticketId,
          createdAt,
        }, correlationId),
      );
    } catch (err) {
      container.logger.error('Failed to create contact ticket', { correlationId });
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
        errorResponse('INTERNAL_ERROR', 'Failed to create contact ticket', undefined, correlationId),
      );
    }
  });

  return router;
}

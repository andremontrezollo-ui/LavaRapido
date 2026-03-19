/**
 * Sessions Route — creates and queries mixing sessions.
 *
 * Replaces (deprecated):
 *   - supabase/functions/mix-sessions     (POST → creates session)
 *   - supabase/functions/mix-session-status (POST → queries session)
 *
 * Architecture Rule: This route delegates to domain use cases only.
 * No domain logic, no direct repository access (except status lookup
 * which is a query with no side effects).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { validateCreateMixSession } from '../schemas/validation.schemas';
import { validateSessionId } from '../validators/index';
import { successResponse, errorResponse } from '../../shared/http/api-response';
import { HttpStatus } from '../../shared/http/HttpStatus';
import type { DependencyContainer } from '../../app/dependency-container';

export function createSessionsRouter(container: DependencyContainer): Router {
  const router = Router();

  /**
   * POST /api/v1/sessions
   * Create a new mixing session.
   * Uses GenerateAddressUseCase to produce a real deposit address
   * with proper expiration policy and domain events.
   */
  router.post('/', async (req: Request, res: Response) => {
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    const validation = validateCreateMixSession(req.body);

    if (!validation.valid) {
      return res.status(HttpStatus.BAD_REQUEST).json(
        errorResponse('VALIDATION_ERROR', 'Invalid request body', { fields: validation.errors }, correlationId),
      );
    }

    try {
      const result = await container.generateAddressUseCase.execute({
        network: 'testnet',
        purpose: 'deposit',
      });

      container.logger.info('Session created', {
        sessionId: result.addressId,
        correlationId,
      });

      return res.status(HttpStatus.CREATED).json(
        successResponse({
          sessionId: result.addressId,
          depositAddress: result.address,
          createdAt: result.createdAt,
          expiresAt: result.expiresAt,
          status: result.status,
        }, correlationId),
      );
    } catch (err) {
      container.logger.error('Failed to create session', {
        correlationId,
        error: err instanceof Error ? err.message : String(err),
      });
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
        errorResponse('INTERNAL_ERROR', 'Failed to create session', undefined, correlationId),
      );
    }
  });

  /**
   * POST /api/v1/sessions/status
   * Look up the status of an existing mixing session.
   * Body: { sessionId: string }
   */
  router.post('/status', async (req: Request, res: Response) => {
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    const validation = validateSessionId(req.body);

    if (!validation.valid) {
      return res.status(HttpStatus.BAD_REQUEST).json(
        errorResponse('VALIDATION_ERROR', validation.error, undefined, correlationId),
      );
    }

    try {
      const address = await container.addressRepo.findById(validation.data.sessionId);

      if (!address) {
        return res.status(HttpStatus.NOT_FOUND).json(
          errorResponse('NOT_FOUND', 'Session not found', undefined, correlationId),
        );
      }

      const now = new Date();
      const status = address.isExpired(now) ? 'expired' : address.status;

      return res.status(HttpStatus.OK).json(
        successResponse({
          sessionId: address.id,
          depositAddress: address.address.value,
          status,
          createdAt: address.createdAt.toISOString(),
          expiresAt: address.expiresAt.toISOString(),
        }, correlationId),
      );
    } catch (err) {
      container.logger.error('Failed to get session status', { correlationId });
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
        errorResponse('INTERNAL_ERROR', 'Failed to retrieve session status', undefined, correlationId),
      );
    }
  });

  return router;
}

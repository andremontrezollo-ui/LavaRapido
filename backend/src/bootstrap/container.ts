/**
 * Dependency Injection Container — wires use cases with their Supabase adapters.
 *
 * Usage in Edge Functions:
 *
 *   import { container } from '../../../backend/src/bootstrap/container.ts';
 *   const result = await container.createMixSession.execute({ clientIp });
 */
import { createSupabaseAdminClient } from '../infra/persistence/supabase/client.ts';
import { SupabaseMixSessionRepository } from '../infra/persistence/supabase/repositories/mix-session.repository.ts';
import { SupabaseContactRepository } from '../infra/persistence/supabase/repositories/contact.repository.ts';
import { SupabaseRateLimitRepository } from '../infra/persistence/supabase/repositories/rate-limit.repository.ts';
import { CreateMixSessionUseCase } from '../modules/mix-session/application/use-cases/create-mix-session.usecase.ts';
import { GetMixSessionStatusUseCase } from '../modules/mix-session/application/use-cases/get-mix-session-status.usecase.ts';
import { CleanupExpiredSessionsUseCase } from '../modules/mix-session/application/use-cases/cleanup-expired-sessions.usecase.ts';
import { SubmitContactMessageUseCase } from '../modules/contact/application/use-cases/submit-contact-message.usecase.ts';
import { GetSystemHealthUseCase } from '../modules/health/application/use-cases/get-system-health.usecase.ts';

function buildContainer() {
  const supabase = createSupabaseAdminClient();

  const sessionRepo = new SupabaseMixSessionRepository(supabase);
  const contactRepo = new SupabaseContactRepository(supabase);
  const rateLimitRepo = new SupabaseRateLimitRepository(supabase);

  return {
    createMixSession: new CreateMixSessionUseCase(sessionRepo, rateLimitRepo),
    getMixSessionStatus: new GetMixSessionStatusUseCase(sessionRepo),
    cleanupExpiredSessions: new CleanupExpiredSessionsUseCase(sessionRepo, rateLimitRepo),
    submitContactMessage: new SubmitContactMessageUseCase(contactRepo, rateLimitRepo),
    getSystemHealth: new GetSystemHealthUseCase(),
  };
}

export const container = buildContainer();

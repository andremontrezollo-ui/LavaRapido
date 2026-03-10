/**
 * Production Entry Point — bootstraps the server using production-container.ts.
 *
 * This file is the executable startup script. It explicitly depends on
 * production-container.ts as the single composition root. There is no
 * alternative wiring path for production.
 */

import { buildProductionContainer } from './bootstrap/production-container';
import { ApplicationService } from './app/application';
import { loadConfig } from './shared/config/load-config';
import { SecureLogger } from './shared/logging/logger';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = new SecureLogger(undefined, undefined, { component: 'startup' });

  logger.info('Bootstrapping production container');
  const container = buildProductionContainer();

  const app = new ApplicationService(container, config, logger);

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info('Received shutdown signal', { signal });
    try {
      await app.stop();
      await container.dispose();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', { error: String(err) });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  await app.start();
}

main().catch((err) => {
  console.error(JSON.stringify({ level: 'error', message: 'Fatal startup error', error: String(err) }));
  process.exit(1);
});

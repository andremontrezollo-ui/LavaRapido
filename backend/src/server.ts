/**
 * Server Entry Point — bootstraps DependencyContainer and starts the HTTP server.
 */
import 'dotenv/config';
import { DependencyContainer } from './app/dependency-container';
import { ApplicationService } from './app/application';
import { SecureLogger } from './shared/logging/logger';
import { loadConfig } from './shared/config/load-config';

async function main(): Promise<void> {
  const logger = new SecureLogger();

  const config = loadConfig();
  const container = new DependencyContainer(
    process.env.REDIS_URL,
    config.outboxPollIntervalMs,
    config.maxRetries,
    config.lockTtlSeconds,
  );

  await container.connect();

  const app = new ApplicationService(container, config, logger);

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    await app.stop();
    await container.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  await app.start();
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

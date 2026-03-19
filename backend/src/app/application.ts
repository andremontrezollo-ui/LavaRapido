import { createServer } from 'http';
import express from 'express';
import type { Application } from './types';
import type { DependencyContainer } from './dependency-container';
import type { AppConfig } from '../shared/config/app-config';
import type { Logger } from '../shared/logging';
import { createRouter } from '../api/router';

export class ApplicationService implements Application {
  private httpServer: ReturnType<typeof createServer> | null = null;
  private isRunning = false;

  constructor(
    private readonly container: DependencyContainer,
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Application is already running');
    }

    this.logger.info('Starting application', {
      environment: this.config.env,
      port: this.config.port,
    });

    const app = express();
    app.use(express.json());
    app.use(createRouter(this.container, this.logger));

    this.httpServer = createServer(app);

    return new Promise((resolve, reject) => {
      this.httpServer!.listen(this.config.port, this.config.host, () => {
        this.isRunning = true;
        this.logger.info('Application started successfully', {
          host: this.config.host,
          port: this.config.port,
        });
        resolve();
      });
      this.httpServer!.on('error', (error: Error) => {
        this.logger.error('Failed to start server', { error: error.message });
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.logger.info('Stopping application');
    return new Promise((resolve, reject) => {
      this.httpServer?.close((error) => {
        if (error) {
          this.logger.error('Error stopping server', { error: error.message });
          reject(error);
        } else {
          this.isRunning = false;
          this.logger.info('Application stopped');
          resolve();
        }
      });
    });
  }

  isHealthy(): boolean {
    return this.isRunning;
  }
}
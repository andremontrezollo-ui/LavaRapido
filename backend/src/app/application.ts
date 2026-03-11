import { createServer } from 'http';
import { Application } from './types';
import { DependencyContainer } from './dependency-container';
import type { Logger } from '../shared/logging';
import { AppConfig } from '../shared/config/app-config';

export class ApplicationService implements Application {
    private httpServer: ReturnType<typeof createServer> | null = null;
    private isRunning = false;

    constructor(
        private container: DependencyContainer,
        private config: AppConfig,
        private logger: Logger,
    ) {}

    async start(): Promise<void> {
        if (this.isRunning) {
            throw new Error('Application is already running');
        }

        this.logger.info('Starting application', {
            version: '1.0.0',
            environment: this.config.env,
            port: this.config.httpPort,
        });

        this.httpServer = createServer(async (req, res) => {
            const requestId = req.headers['x-request-id'] as string || require('crypto').randomUUID();
            res.setHeader('X-Request-ID', requestId);
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');

            if (req.url === '/health' && req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
                return;
            }

            if (req.url === '/ready' && req.method === 'GET') {
                const readiness = await this.container.readinessCheck();
                res.writeHead(readiness.isReady ? 200 : 503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(readiness));
                return;
            }

            res.writeHead(404);
            res.end();
        });

        return new Promise((resolve, reject) => {
            this.httpServer?.listen(this.config.httpPort, this.config.httpHost, () => {
                this.isRunning = true;
                this.logger.info('Application started successfully', {
                    host: this.config.httpHost,
                    port: this.config.httpPort,
                });
                resolve();
            });
            this.httpServer?.on('error', (error) => {
                this.logger.error('Failed to start server', { error: error.message, stack: error.stack });
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
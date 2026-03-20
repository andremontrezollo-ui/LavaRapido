import express, { type Express, type Request, type Response } from 'express';
import { createServer } from 'http';
import type { Server } from 'http';
import type { Application } from './types';
import type { DependencyContainer } from './dependency-container';
import type { Logger } from '../shared/logging/logger';
import type { AppConfig } from '../shared/config/app-config';
import { HealthController } from '../api/controllers/health.controller';
import { CorrelationIdMiddleware } from '../api/middlewares/correlation-id.middleware';
import { RequestLoggingMiddleware } from '../api/middlewares/request-logging.middleware';
import { ErrorHandler } from '../api/errors/error-handler';
import { CryptoIdGenerator } from '../shared/ports/IdGenerator';

export class ApplicationService implements Application {
    private httpServer: Server | null = null;
    private expressApp: Express | null = null;
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
            version: this.config.version,
            environment: this.config.env,
            port: this.config.port,
        });

        const app = express();
        this.expressApp = app;

        const correlationMiddleware = new CorrelationIdMiddleware(new CryptoIdGenerator());
        const loggingMiddleware = new RequestLoggingMiddleware(this.logger);
        const errorHandler = new ErrorHandler(this.logger);
        const healthController = new HealthController(
            this.container.outboxStore,
            this.container.jobStore,
        );

        // Security headers
        app.use((_req: Request, res: Response, next: express.NextFunction) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            next();
        });

        // Correlation ID
        app.use((req: Request, res: Response, next: express.NextFunction) => {
            const rawHeaders: Record<string, string> = {};
            for (const [key, val] of Object.entries(req.headers)) {
                if (typeof val === 'string') rawHeaders[key] = val;
                else if (Array.isArray(val)) rawHeaders[key] = val[0] ?? '';
            }
            const requestId = correlationMiddleware.extract(rawHeaders);
            res.setHeader('X-Request-ID', requestId);
            res.locals['correlationId'] = requestId;
            next();
        });

        // Request logging
        app.use((req: Request, res: Response, next: express.NextFunction) => {
            const correlationId: string = res.locals['correlationId'] ?? '';
            loggingMiddleware.logRequest(req.method, req.url, correlationId);
            const startTime = Date.now();
            res.on('finish', () => {
                loggingMiddleware.logResponse(
                    req.method,
                    req.url,
                    res.statusCode,
                    Date.now() - startTime,
                    correlationId,
                );
            });
            next();
        });

        app.use(express.json());

        // Health endpoints
        app.get('/health', async (_req: Request, res: Response) => {
            try {
                const status = await healthController.liveness();
                res.status(200).json(status);
            } catch (err) {
                const { status, body } = errorHandler.handle(err);
                res.status(status).json(body);
            }
        });

        app.get('/ready', async (_req: Request, res: Response) => {
            try {
                const status = await healthController.readiness();
                const httpStatus = status.status === 'unhealthy' ? 503 : 200;
                res.status(httpStatus).json(status);
            } catch (err) {
                const { status, body } = errorHandler.handle(err);
                res.status(status).json(body);
            }
        });

        // 404 fallback
        app.use((_req: Request, res: Response) => {
            res.status(404).json({ error: 'Not Found' });
        });

        // Centralized error handler
        app.use((err: unknown, _req: Request, res: Response, _next: express.NextFunction) => {
            const { status, body } = errorHandler.handle(err);
            res.status(status).json(body);
        });

        this.httpServer = createServer(app);

        return new Promise((resolve, reject) => {
            this.httpServer?.listen(this.config.port, this.config.host, () => {
                this.isRunning = true;
                this.container.startBackgroundTasks();
                this.logger.info('Application started successfully', {
                    host: this.config.host,
                    port: this.config.port,
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
        this.container.stopBackgroundTasks();
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
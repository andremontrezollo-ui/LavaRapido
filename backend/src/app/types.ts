/**
 * Application interface — defines the lifecycle contract for the server.
 */

export interface Application {
  start(): Promise<void>;
  stop(): Promise<void>;
  isHealthy(): boolean;
}

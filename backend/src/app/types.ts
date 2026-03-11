/**
 * Application types — core lifecycle contracts.
 */

export interface Application {
  start(): Promise<void>;
  stop(): Promise<void>;
  isHealthy(): boolean;
}

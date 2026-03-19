/**
 * Application lifecycle contract.
 */

export interface Application {
  start(): Promise<void>;
  stop(): Promise<void>;
  isHealthy(): boolean;
}

/**
 * Application lifecycle interface.
 */
export interface Application {
  start(): Promise<void>;
  stop(): Promise<void>;
  isHealthy(): boolean;
}

/**
 * Application Lifecycle Contract.
 * The main ApplicationService implements this interface.
 */
export interface Application {
  start(): Promise<void>;
  stop(): Promise<void>;
  isHealthy(): boolean;
}

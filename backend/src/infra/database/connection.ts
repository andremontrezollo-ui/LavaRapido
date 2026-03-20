/**
 * Database Connection — placeholder for future Postgres/Supabase integration.
 * Currently the backend uses in-memory stores for all persistence.
 */

export interface DatabaseConnection {
  isConnected(): boolean;
  disconnect(): Promise<void>;
}

export class NoopDatabaseConnection implements DatabaseConnection {
  /** Always returns false — this is a placeholder until Supabase/Postgres integration is implemented. */
  isConnected(): boolean { return false; }
  async disconnect(): Promise<void> { /* no-op */ }
}

export const databaseConnection: DatabaseConnection = new NoopDatabaseConnection();
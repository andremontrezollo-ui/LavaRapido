/**
 * ProcessedMessageRepository — PostgreSQL-backed replay protection store.
 * Persists message IDs with HMAC signatures to prevent replay attacks.
 * Uses ON CONFLICT DO NOTHING for atomic deduplication.
 */

import { createHmac } from 'crypto';

export interface ProcessedMessage {
  readonly messageId: string;
  readonly signature: string;
  readonly processedAt: Date;
}

export interface ProcessedMessageStore {
  isProcessed(messageId: string): Promise<boolean>;
  markProcessed(messageId: string, signature: string): Promise<boolean>;
  computeSignature(messageId: string, payload: string): string;
}

export class ProcessedMessageRepository implements ProcessedMessageStore {
  constructor(
    private readonly db: { query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> },
    private readonly hmacSecret: string,
  ) {}

  async isProcessed(messageId: string): Promise<boolean> {
    const { rows } = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::int AS count
         FROM processed_messages
        WHERE message_id = $1`,
      [messageId],
    );
    return Number(rows[0]?.count ?? 0) > 0;
  }

  /**
   * Atomically inserts the message ID.
   * Returns true if newly registered, false if already existed (replay detected).
   */
  async markProcessed(messageId: string, signature: string): Promise<boolean> {
    const { rows } = await this.db.query<{ inserted: boolean }>(
      `WITH ins AS (
         INSERT INTO processed_messages (message_id, signature, processed_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (message_id) DO NOTHING
         RETURNING TRUE AS inserted
       )
       SELECT COALESCE((SELECT inserted FROM ins), FALSE) AS inserted`,
      [messageId, signature],
    );
    return rows[0]?.inserted === true;
  }

  computeSignature(messageId: string, payload: string): string {
    return createHmac('sha256', this.hmacSecret)
      .update(`${messageId}:${payload}`)
      .digest('hex');
  }

  verifySignature(messageId: string, payload: string, signature: string): boolean {
    const expected = this.computeSignature(messageId, payload);
    // Constant-time comparison
    if (expected.length !== signature.length) return false;
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
      mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return mismatch === 0;
  }
}

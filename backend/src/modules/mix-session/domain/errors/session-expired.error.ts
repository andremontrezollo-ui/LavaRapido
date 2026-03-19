/**
 * Error: SessionExpired
 * Thrown when an operation is attempted on an expired mix session.
 */

export class SessionExpiredError extends Error {
  readonly sessionId: string;

  constructor(sessionId: string) {
    super(`Mix session ${sessionId} has expired`);
    this.name = 'SessionExpiredError';
    this.sessionId = sessionId;
  }
}

export class UnsupportedSourceEventError extends Error {
  constructor(eventType: string) {
    super(`Unsupported blockchain source event type: ${eventType}`);
    this.name = 'UnsupportedSourceEventError';
  }
}

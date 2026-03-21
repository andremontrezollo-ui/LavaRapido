export class InvalidLogEntryError extends Error {
  constructor(reason: string) {
    super(`Invalid log entry: ${reason}`);
    this.name = 'InvalidLogEntryError';
  }
}

export class UnsupportedClassificationError extends Error {
  constructor(classification: string) {
    super(`Unsupported sensitivity classification: ${classification}`);
    this.name = 'UnsupportedClassificationError';
  }
}

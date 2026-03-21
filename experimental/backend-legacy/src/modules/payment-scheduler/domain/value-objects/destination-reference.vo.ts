export class DestinationReference {
  private constructor(readonly address: string, readonly label?: string) {}
  static create(address: string, label?: string): DestinationReference {
    if (!address || address.length < 10) throw new Error(`Invalid destination: ${address}`);
    return new DestinationReference(address, label);
  }
}

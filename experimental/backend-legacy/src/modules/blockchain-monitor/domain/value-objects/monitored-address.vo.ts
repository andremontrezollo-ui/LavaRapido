/**
 * MonitoredAddress Value Object
 */

export class MonitoredAddress {
  private constructor(readonly value: string) {}

  static create(address: string): MonitoredAddress {
    if (!address || address.length < 10) {
      throw new Error(`Invalid monitored address: ${address}`);
    }
    return new MonitoredAddress(address);
  }

  equals(other: MonitoredAddress): boolean {
    return this.value === other.value;
  }
}

/**
 * AddressNamespace Value Object
 * 
 * Classifies the purpose of a generated address.
 */

export type NamespacePurpose = 'deposit' | 'withdrawal' | 'internal';

export class AddressNamespace {
  readonly value: string;
  readonly purpose: NamespacePurpose;

  private constructor(value: string, purpose: NamespacePurpose) {
    this.value = value;
    this.purpose = purpose;
  }

  static create(value: string, purpose: NamespacePurpose): AddressNamespace {
    if (!value || value.trim().length === 0) {
      throw new Error('Namespace value cannot be empty');
    }
    return new AddressNamespace(value.trim(), purpose);
  }

  equals(other: AddressNamespace): boolean {
    return this.value === other.value && this.purpose === other.purpose;
  }
}

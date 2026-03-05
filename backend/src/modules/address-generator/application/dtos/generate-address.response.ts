/**
 * GenerateAddress Response DTO
 */

export interface GenerateAddressResponse {
  readonly addressId: string;
  readonly address: string;
  readonly network: string;
  readonly purpose: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly status: string;
}

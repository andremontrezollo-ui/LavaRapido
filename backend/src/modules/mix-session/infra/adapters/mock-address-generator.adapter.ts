/**
 * MockTestnetAddressGenerator
 *
 * Generates mock Bitcoin testnet addresses (tb1q…) for development and
 * staging environments. Extracted from the supabase/functions/mix-sessions
 * edge function to centralise address-generation logic in the backend.
 */

import type { MixAddressGenerator } from '../../application/ports/address-generator.port';

const TESTNET_CHARSET = '0123456789abcdefghijklmnopqrstuvwxyz';

export class MockTestnetAddressGenerator implements MixAddressGenerator {
  generateDepositAddress(): string {
    const body = new Uint8Array(38);
    crypto.getRandomValues(body);
    const encoded = Array.from(
      body,
      (b) => TESTNET_CHARSET[b % TESTNET_CHARSET.length],
    ).join('');
    return `tb1q${encoded.slice(0, 38)}`;
  }
}

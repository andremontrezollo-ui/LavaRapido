/**
 * Clock Port for blockchain-monitor
 */

export interface BlockchainClock {
  now(): Date;
}

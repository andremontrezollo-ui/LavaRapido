/**
 * Global type declarations for Node.js 18+ Web Crypto API.
 * Node.js 18+ exposes `globalThis.crypto` as the Web Crypto API.
 */

declare const crypto: {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
  randomUUID(): `${string}-${string}-${string}-${string}-${string}`;
};

/**
 * Auth Service — authenticates users with email/password using PBKDF2-SHA256.
 * Stores passwords in the format: "pbkdf2:<iterations>:<salt_hex>:<hash_hex>"
 */

import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
import type { JwtVerifier, JwtPayload } from './jwt-verifier';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  roles: string[];
  scopes: string[];
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
}

export interface AuthenticateResult {
  success: boolean;
  token?: string;
  reason?: string;
  user?: Pick<User, 'id' | 'email' | 'roles' | 'scopes'>;
}

/** Iterations and key length tuned for PBKDF2-SHA256 security */
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 64;
const DIGEST = 'sha256';

export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly jwtVerifier: JwtVerifier,
  ) {}

  async authenticate(email: string, password: string): Promise<AuthenticateResult> {
    if (!email || !password) {
      return { success: false, reason: 'Invalid credentials' };
    }

    const user = await this.userRepo.findByEmail(email.toLowerCase().trim());
    if (!user) {
      // Perform dummy hash to prevent user enumeration via timing
      this.dummyHash();
      return { success: false, reason: 'Invalid credentials' };
    }

    const valid = this.verifyPassword(password, user.passwordHash);
    if (!valid) {
      return { success: false, reason: 'Invalid credentials' };
    }

    const token = this.jwtVerifier.create({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      scopes: user.scopes,
    });

    return {
      success: true,
      token,
      user: { id: user.id, email: user.email, roles: user.roles, scopes: user.scopes },
    };
  }

  /**
   * Hash a plain-text password with PBKDF2-SHA256.
   * Format: "pbkdf2:<iterations>:<salt_hex>:<hash_hex>"
   */
  hashPassword(plaintext: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(plaintext, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
    return `pbkdf2:${PBKDF2_ITERATIONS}:${salt}:${hash}`;
  }

  verifyPassword(plaintext: string, storedHash: string): boolean {
    try {
      const [scheme, itersStr, salt, expectedHex] = storedHash.split(':');
      if (scheme !== 'pbkdf2') return false;
      const iters = parseInt(itersStr, 10);
      const actual = pbkdf2Sync(plaintext, salt, iters, KEY_LENGTH, DIGEST);
      const expected = Buffer.from(expectedHex, 'hex');
      if (actual.length !== expected.length) return false;
      return timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }

  private dummyHash(): void {
    // Constant-time dummy to prevent timing-based user enumeration
    pbkdf2Sync('dummy', randomBytes(16).toString('hex'), PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST);
  }
}

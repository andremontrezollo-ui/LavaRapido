import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  roles?: string[];
  scopes?: string[];
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export interface JwtVerifierOptions {
  secret?: string;
  publicKey?: string;
  algorithm?: 'HS256' | 'RS256';
  issuer?: string;
  audience?: string;
}

export class JwtVerifier {
  constructor(private readonly options: JwtVerifierOptions) {}

  async verify(token: string): Promise<JwtPayload> {
    return new Promise((resolve, reject) => {
      const secret = this.options.secret ?? this.options.publicKey;
      if (!secret) {
        reject(new Error('JwtVerifier requires either secret or publicKey to be configured'));
        return;
      }
      const verifyOptions: jwt.VerifyOptions = {
        algorithms: [this.options.algorithm ?? 'HS256'],
      };
      if (this.options.issuer) verifyOptions.issuer = this.options.issuer;
      if (this.options.audience) verifyOptions.audience = this.options.audience;

      jwt.verify(token, secret, verifyOptions, (err, decoded) => {
        if (err) {
          reject(new Error(`Invalid token: ${err.message}`));
        } else {
          resolve(decoded as JwtPayload);
        }
      });
    });
  }
}

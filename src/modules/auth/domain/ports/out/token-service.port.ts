import { Role } from '@prisma/client';

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
}

export interface TokenServicePort {
  generateToken(payload: JwtPayload): string;
  verifyToken(token: string): JwtPayload;
}

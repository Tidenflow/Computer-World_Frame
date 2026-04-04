import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  userId: number;
  username: string;
}

export function generateToken(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: config.auth.jwtExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, config.auth.jwtSecret, options);
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, config.auth.jwtSecret) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

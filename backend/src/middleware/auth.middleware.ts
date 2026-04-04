import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import type { ApiResponse } from '@shared/contract';

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      username?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' }
    } as ApiResponse<null>);
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    req.username = payload.username;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      data: null,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
    } as ApiResponse<null>);
  }
}

import type { Request, Response } from 'express';

export function notFoundMiddleware(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    data: null,
    error: { code: 'NOT_FOUND', message: 'API not found' },
  });
}

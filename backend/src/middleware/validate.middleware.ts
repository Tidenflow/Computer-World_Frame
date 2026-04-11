import type { Request, Response, NextFunction } from 'express';

function failValidation(res: Response, message: string): void {
  res.status(400).json({
    success: false,
    data: null,
    error: { code: 'VALIDATION_ERROR', message }
  });
}

export function validateAuthPayload(req: Request, res: Response, next: NextFunction): void {
  const { username, password } = req.body as { username?: unknown; password?: unknown };
  if (typeof username !== 'string' || username.trim().length === 0) {
    failValidation(res, 'username is required');
    return;
  }
  if (typeof password !== 'string' || password.trim().length === 0) {
    failValidation(res, 'password is required');
    return;
  }
  next();
}

export function validateUserIdParam(req: Request, res: Response, next: NextFunction): void {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    failValidation(res, 'invalid userId');
    return;
  }
  next();
}

export function validateProgressBody(req: Request, res: Response, next: NextFunction): void {
  const { unlocked } = req.body as { unlocked?: unknown };
  if (typeof unlocked !== 'object' || unlocked === null || Array.isArray(unlocked)) {
    failValidation(res, 'invalid unlocked');
    return;
  }
  next();
}

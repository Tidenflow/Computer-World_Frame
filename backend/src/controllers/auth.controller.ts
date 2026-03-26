import type { Request, Response } from 'express';
import type { LoginRequest, RegisterRequest } from '@shared/contract';
import { authService } from '../services/auth.service';
import { statusByErrorCode } from '../utils/error-status';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const payload = req.body as RegisterRequest;
    const result = await authService.register(payload);

    if (!result.success) {
      res.status(statusByErrorCode(result.error.code)).json(result);
      return;
    }

    res.status(201).json(result);
  }

  async login(req: Request, res: Response): Promise<void> {
    const payload = req.body as LoginRequest;
    const result = await authService.login(payload);

    if (!result.success) {
      res.status(statusByErrorCode(result.error.code)).json(result);
      return;
    }

    res.status(200).json(result);
  }
}

export const authController = new AuthController();

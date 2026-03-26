import type { Request, Response } from 'express';
import type { LoginRequest, RegisterRequest } from '@shared/contract';
import { authService } from '../services/auth.service';

// 把 Service 返回的错误码 → 转换成 HTTP 状态码  --工具函数
function statusByErrorCode(code: string): number {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 400;
    case 'USER_EXISTS':
      return 409;
    case 'INVALID_CREDENTIALS':
      return 401;
    default:
      return 400;
  }
}

// 核心类：AuthController
export class AuthController {
  // 处理前端注册请求
  async register(req: Request, res: Response): Promise<void> { //Promise<void>因为直接用 res.send() 输出，不 return 数据
    const payload = req.body as RegisterRequest;
    const result = await authService.register(payload);

    if (!result.success) {
      res.status(statusByErrorCode(result.error.code)).json(result);
      return;
    }

    res.status(201).json(result);
  }

  // 处理前端登录请求
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

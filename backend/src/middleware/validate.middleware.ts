// 检查数据有效性
import type { Request, Response, NextFunction } from 'express';

// 所有校验失败统一返回格式，下面都调用这个函数  --工具函数
function failValidation(res: Response, message: string): void {
  res.status(400).json({
    success: false,
    data: null,
    error: { code: 'VALIDATION_ERROR', message },
  });
}

// 校验登录 / 注册的用户名密码   不能为空
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

// 校验路由里的 userId  必须为正整数
export function validateUserIdParam(req: Request, res: Response, next: NextFunction): void {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    failValidation(res, 'invalid userId');
    return;
  }
  next();
}

// 校验学习进度的参数  unlocked 必须是对象  不能是 null / 不能是数组
export function validateProgressBody(req: Request, res: Response, next: NextFunction): void {
  const { unlocked } = req.body as { unlocked?: unknown };
  if (typeof unlocked !== 'object' || unlocked === null || Array.isArray(unlocked)) {
    failValidation(res, 'invalid unlocked');
    return;
  }
  next();
}

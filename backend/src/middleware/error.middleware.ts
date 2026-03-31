// 全局统一处理所有错误的中间件，不管哪里抛错，最终都到这里，统一返回格式。
import type { NextFunction, Request, Response } from 'express';

export function errorMiddleware(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    data: null,
    error: { code: 'SERVER_ERROR', message: 'Internal server error' },
  });
}

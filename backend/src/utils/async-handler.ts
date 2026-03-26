// 自动捕获异步路由里的所有错误，不用每个接口都写 try/catch。
import type { NextFunction, Request, Response, RequestHandler } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncHandler(handler: AsyncRouteHandler): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

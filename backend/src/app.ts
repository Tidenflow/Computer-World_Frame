import express, { type NextFunction, type Request, type Response } from 'express';
import authRouter from './routers/auth.router';
import progressRouter from './routers/progress.router';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/auth', authRouter);
app.use('/api/users', progressRouter);

// 终点中间件  1.匹配所有前面没命中的请求   2.直接返回响应并结束请求链
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    data: null,
    error: { code: 'NOT_FOUND', message: 'API not found' },
  });
});

// 全局错误中间件  接收 next(error)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    data: null,
    error: { code: 'SERVER_ERROR', message: 'Internal server error' },
  });
});

export default app;

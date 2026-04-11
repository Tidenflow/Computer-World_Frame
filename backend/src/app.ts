import express from 'express';
import cors from 'cors';
import authRouter from './routers/auth.router';
import progressRouter from './routers/progress.router';
import mapRouter from './routers/map.router';
<<<<<<< HEAD
import nodeRouter from './routers/node.router';
import { config } from './config';
=======
>>>>>>> 3784d80 (refactor: remove legacy node api route)
import { notFoundMiddleware } from './middleware/not-found.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // 允许没有 origin 的请求（如 Postman）或白名单中的 origin
    const allowedOrigins = config.app.corsOrigin;
    if (!origin || allowedOrigins === '*' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/auth', authRouter);
app.use('/api/maps', mapRouter);
app.use('/api/users', authMiddleware, progressRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;


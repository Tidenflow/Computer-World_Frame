import express from 'express';
import cors from 'cors';
import authRouter from './routers/auth.router';
import progressRouter from './routers/progress.router';
import mapRouter from './routers/map.router';
import { config } from './config';
import { isAllowedCorsOrigin } from './config/cors';
import { notFoundMiddleware } from './middleware/not-found.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';

const app = express();

function isAllowedCorsOrigin(origin: string | undefined, allowedOrigins: string[] | string): boolean {
  if (!origin || allowedOrigins === '*') {
    return true;
  }

  const localOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ]);

  if (localOrigins.has(origin)) {
    return true;
  }

  return Array.isArray(allowedOrigins) ? allowedOrigins.includes(origin) : allowedOrigins === origin;
}

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = config.app.corsOrigin;
    if (isAllowedCorsOrigin(origin, allowedOrigins)) {
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


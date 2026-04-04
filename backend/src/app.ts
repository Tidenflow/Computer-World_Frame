import express from 'express';
import cors from 'cors';
import authRouter from './routers/auth.router';
import progressRouter from './routers/progress.router';
import mapRouter from './routers/map.router';
import nodeRouter from './routers/node.router';
import { notFoundMiddleware } from './middleware/not-found.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/auth', authRouter);
app.use('/api/maps', mapRouter);
app.use('/api/nodes', nodeRouter);
app.use('/api/users', authMiddleware, progressRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;


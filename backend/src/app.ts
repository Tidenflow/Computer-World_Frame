import express from 'express';
import authRouter from './routers/auth.router';
import progressRouter from './routers/progress.router';
import { notFoundMiddleware } from './middleware/not-found.middleware';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/auth', authRouter);
app.use('/api/users', progressRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;

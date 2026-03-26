import { Router } from 'express';
import { authController } from '../controllers/auth.controller';

const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    await authController.register(req, res);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    await authController.login(req, res);
  } catch (error) {
    next(error);
  }
});

export default authRouter;

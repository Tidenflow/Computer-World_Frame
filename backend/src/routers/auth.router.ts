import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateAuthPayload } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/async-handler';

const authRouter = Router();

authRouter.post('/register', validateAuthPayload, asyncHandler(async (req, res) => {
  await authController.register(req, res);
}));

authRouter.post('/login', validateAuthPayload, asyncHandler(async (req, res) => {
  await authController.login(req, res);
}));

export default authRouter;

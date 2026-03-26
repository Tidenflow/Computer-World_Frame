import { Router } from 'express';
import { progressController } from '../controllers/progress.controller';
import { validateProgressBody, validateUserIdParam } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/async-handler';

const progressRouter = Router();

progressRouter.get('/:userId/progress', validateUserIdParam, asyncHandler(async (req, res) => {
  await progressController.getProgress(req, res);
}));

progressRouter.put(
  '/:userId/progress',
  validateUserIdParam,
  validateProgressBody,
  asyncHandler(async (req, res) => {
    await progressController.updateProgress(req, res);
  })
);

export default progressRouter;

import { Router } from 'express';
import { progressController } from '../controllers/progress.controller';

const progressRouter = Router();

progressRouter.get('/:userId/progress', async (req, res, next) => {
  try {
    await progressController.getProgress(req, res);
  } catch (error) {
    next(error);
  }
});

progressRouter.put('/:userId/progress', async (req, res, next) => {
  try {
    await progressController.updateProgress(req, res);
  } catch (error) {
    next(error);
  }
});

export default progressRouter;

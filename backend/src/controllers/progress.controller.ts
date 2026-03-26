import type { Request, Response } from 'express';
import { progressService } from '../services/progress.service';
import { statusByErrorCode } from '../utils/error-status';

export class ProgressController {
  async getProgress(req: Request, res: Response): Promise<void> {
    const userId = Number(req.params.userId);
    const result = await progressService.getProgress(userId);

    if (!result.success) {
      res.status(statusByErrorCode(result.error.code)).json(result);
      return;
    }

    res.status(200).json(result);
  }

  async updateProgress(req: Request, res: Response): Promise<void> {
    const userId = Number(req.params.userId);
    const { unlockedNodes } = req.body as { unlockedNodes?: unknown };
    const result = await progressService.updateProgress(userId, unlockedNodes);

    if (!result.success) {
      res.status(statusByErrorCode(result.error.code)).json(result);
      return;
    }

    res.status(200).json(result);
  }
}

export const progressController = new ProgressController();

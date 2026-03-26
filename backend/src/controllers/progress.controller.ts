import type { Request, Response } from 'express';
import { progressService } from '../services/progress.service';

function statusByErrorCode(code: string): number {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 400;
    case 'USER_NOT_FOUND':
      return 404;
    case 'PROGRESS_NOT_FOUND':
      return 404;
    default:
      return 400;
  }
}

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

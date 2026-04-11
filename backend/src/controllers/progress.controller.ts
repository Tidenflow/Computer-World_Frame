import type { Request, Response } from 'express';
import { progressService } from '../services/progress.service';
import { statusByErrorCode } from '../utils/error-status';

export class ProgressController {
  async getProgress(req: Request, res: Response): Promise<void> {
    const userId = Number(req.params.userId);
    const mapId = typeof req.query.mapId === 'string' ? req.query.mapId : 'computer-world';
    const mapVersion = typeof req.query.mapVersion === 'string' ? req.query.mapVersion : undefined;
    const result = await progressService.getProgress(userId, mapId, mapVersion);

    if (!result.success) {
      res.status(statusByErrorCode(result.error.code)).json(result);
      return;
    }

    res.status(200).json(result);
  }

  async updateProgress(req: Request, res: Response): Promise<void> {
    const userId = Number(req.params.userId);
    const { mapId, mapVersion, unlocked } = req.body as {
      mapId?: unknown;
      mapVersion?: unknown;
      unlocked?: unknown;
    };
    const result = await progressService.updateProgress(
      userId,
      typeof mapId === 'string' ? mapId : 'computer-world',
      typeof mapVersion === 'string' ? mapVersion : '',
      unlocked
    );

    if (!result.success) {
      res.status(statusByErrorCode(result.error.code)).json(result);
      return;
    }

    res.status(200).json(result);
  }

  async unlockNode(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const { mapId, mapVersion, nodeId, matchedTerm } = req.body as {
      mapId?: unknown;
      mapVersion?: unknown;
      nodeId?: unknown;
      matchedTerm?: unknown;
    };
    const result = await progressService.unlockNode({
      userId,
      mapId: typeof mapId === 'string' ? mapId : 'computer-world',
      mapVersion: typeof mapVersion === 'string' ? mapVersion : '',
      nodeId: typeof nodeId === 'string' ? nodeId : '',
      matchedTerm: typeof matchedTerm === 'string' ? matchedTerm : undefined
    });

    if (!result.success) {
      res.status(statusByErrorCode(result.error.code)).json(result);
      return;
    }

    res.status(200).json(result);
  }
}

export const progressController = new ProgressController();

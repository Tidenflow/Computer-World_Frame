import type { Request, Response } from 'express';
import { progressService } from '../services/progress.service';

//把业务错误码 → 转为 HTTP 状态码
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
  // 获取用户进度的接口
  async getProgress(req: Request, res: Response): Promise<void> {
    const userId = Number(req.params.userId);
    const result = await progressService.getProgress(userId);

    if (!result.success) {
      res.status(statusByErrorCode(result.error.code)).json(result);
      return;
    }

    res.status(200).json(result);
  }

  // 更新用户进度的接口
  async updateProgress(req: Request, res: Response): Promise<void> {
    const userId = Number(req.params.userId);
    const { unlockedNodes } = req.body as { unlockedNodes?: unknown };
    const result = await progressService.updateProgress(userId, unlockedNodes);

    if (!result.success) {
      res.status(statusByErrorCode(result.error.code)).json(result);
      return;
    }

    res.status(200).json(result);  //result就是响应体
  }
}

export const progressController = new ProgressController();

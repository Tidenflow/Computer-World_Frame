import type { ApiResponse, CWFrameProgress } from '@shared/contract';
import { progressRepo } from '../repositories/progress.repo';
import { userRepo } from '../repositories/user.repo';

// 校验用户 ID 是否合法（必须是正整数）
function isValidUserId(userId: number): boolean {
  return Number.isInteger(userId) && userId > 0;
}

// 校验解锁节点是否是合法对象
function isValidUnlockedNodes(
  unlockedNodes: unknown
): unlockedNodes is CWFrameProgress['unlockedNodes'] {
  return typeof unlockedNodes === 'object' && unlockedNodes !== null && !Array.isArray(unlockedNodes);
}

// 核心类 ：ProgressService 
export class ProgressService {
  // 获取用户的解锁进度
  async getProgress(userId: number): Promise<ApiResponse<CWFrameProgress>> {
    if (!isValidUserId(userId)) {
      return {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'invalid userId' },
      };
    }

    const user = await userRepo.findById(userId);
    if (!user) {
      return {
        success: false,
        data: null,
        error: { code: 'USER_NOT_FOUND', message: 'user not found' },
      };
    }

    const found = await progressRepo.findByUserId(userId);
    const data = found ?? { userId, unlockedNodes: {} };
    return { success: true, data, message: 'ok' };
  }

  // 更新用户的解锁节点进度
  async updateProgress(
    userId: number,
    unlockedNodes: unknown
  ): Promise<ApiResponse<CWFrameProgress>> {
    if (!isValidUserId(userId)) {
      return {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'invalid userId' },
      };
    }

    const user = await userRepo.findById(userId);
    if (!user) {
      return {
        success: false,
        data: null,
        error: { code: 'USER_NOT_FOUND', message: 'user not found' },
      };
    }

    if (!isValidUnlockedNodes(unlockedNodes)) {
      return {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'invalid unlockedNodes' },
      };
    }

    const saved = await progressRepo.upsertByUserId({ userId, unlockedNodes });
    return { success: true, data: saved, message: 'updated' };
  }
}

export const progressService = new ProgressService();

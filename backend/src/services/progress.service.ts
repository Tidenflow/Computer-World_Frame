import type { ApiResponse, CWFrameProgress } from '@shared/contract';
import { progressRepo } from '../repositories/progress.repo';
import { userRepo } from '../repositories/user.repo';
import { prisma } from '../lib/prisma';

function isValidUserId(userId: number): boolean {
  return Number.isInteger(userId) && userId > 0;
}

function isValidUnlockedNodes(unlockedNodes: unknown): unlockedNodes is CWFrameProgress['unlockedNodes'] {
  return typeof unlockedNodes === 'object' && unlockedNodes !== null && !Array.isArray(unlockedNodes);
}

export class ProgressService {
  async getProgress(userId: number): Promise<ApiResponse<CWFrameProgress>> {
    if (!isValidUserId(userId)) {
      return {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'invalid userId' }
      };
    }

    const user = await userRepo.findById(userId);
    if (!user) {
      return {
        success: false,
        data: null,
        error: { code: 'USER_NOT_FOUND', message: 'user not found' }
      };
    }

    const found = await progressRepo.findByUserId(userId);
    const data = found ?? { userId, unlockedNodes: {} };
    return { success: true, data, message: 'ok' };
  }

  async unlockNode(userId: number, nodeId: number, matchedTerm?: string): Promise<ApiResponse<{ nodeId: number; unlockedAt: number }>> {
    if (!Number.isInteger(nodeId) || nodeId <= 0) {
      return {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid node ID' }
      };
    }

    const node = await prisma.node.findUnique({ where: { id: nodeId } });
    if (!node) {
      return {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Node not found' }
      };
    }

    const existing = await prisma.userProgress.findUnique({
      where: { uk_user_node: { userId, nodeId } }
    });

    if (existing) {
      return {
        success: true,
        data: { nodeId, unlockedAt: existing.unlockedAt.getTime() },
        message: 'Node already unlocked'
      };
    }

    const record = await prisma.userProgress.create({
      data: { userId, nodeId, matchedTerm }
    });

    return {
      success: true,
      data: { nodeId, unlockedAt: record.unlockedAt.getTime() },
      message: 'Node unlocked'
    };
  }

  async updateProgress(userId: number, unlockedNodes: unknown): Promise<ApiResponse<CWFrameProgress>> {
    if (!isValidUserId(userId)) {
      return {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'invalid userId' }
      };
    }

    const user = await userRepo.findById(userId);
    if (!user) {
      return {
        success: false,
        data: null,
        error: { code: 'USER_NOT_FOUND', message: 'user not found' }
      };
    }

    if (!isValidUnlockedNodes(unlockedNodes)) {
      return {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'invalid unlockedNodes' }
      };
    }

    const saved = await progressRepo.upsertByUserId({ userId, unlockedNodes });
    return { success: true, data: saved, message: 'updated' };
  }
}

export const progressService = new ProgressService();

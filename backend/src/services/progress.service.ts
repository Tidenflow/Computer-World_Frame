import type { ApiResponse } from '@shared/contract';
import type { UserProgressDocument } from '@shared/map-document';
import { progressRepo } from '../repositories/progress.repo';
import { userRepo } from '../repositories/user.repo';
import { mapRepo } from '../repositories/map.repo';

function isValidUserId(userId: number): boolean {
  return Number.isInteger(userId) && userId > 0;
}

function isUnlockedDocument(
  unlocked: unknown
): unlocked is UserProgressDocument['unlocked'] {
  return typeof unlocked === 'object' && unlocked !== null && !Array.isArray(unlocked);
}

export class ProgressService {
  async getProgress(
    userId: number,
    mapId = 'computer-world',
    mapVersion?: string
  ): Promise<ApiResponse<UserProgressDocument>> {
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

    const currentMap = await mapRepo.getDefaultMap();
    if (!currentMap) {
      return {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'default map not found' }
      };
    }

    const resolvedVersion = mapVersion ?? currentMap.document.version;
    const found = await progressRepo.findByUserMapVersion(userId, mapId, resolvedVersion);
    const data = found ?? {
      userId,
      mapId,
      mapVersion: resolvedVersion,
      unlocked: {}
    };

    return { success: true, data, message: 'ok' };
  }

  async unlockNode(input: {
    userId: number;
    mapId: string;
    mapVersion: string;
    nodeId: string;
    matchedTerm?: string;
  }): Promise<ApiResponse<{ nodeId: string; unlockedAt: number }>> {
    if (!input.nodeId.trim()) {
      return {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid node ID' }
      };
    }

    const currentMap = await mapRepo.getDefaultMap();
    if (!currentMap) {
      return {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'default map not found' }
      };
    }

    if (
      currentMap.document.mapId !== input.mapId ||
      currentMap.document.version !== input.mapVersion
    ) {
      return {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Map version not found' }
      };
    }

    const node = currentMap.projection.nodeById[input.nodeId];
    if (!node) {
      return {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Node not found' }
      };
    }

    const existing = await progressRepo.findByUserMapVersion(
      input.userId,
      input.mapId,
      input.mapVersion
    );

    const progress: UserProgressDocument = existing ?? {
      userId: input.userId,
      mapId: input.mapId,
      mapVersion: input.mapVersion,
      unlocked: {}
    };

    if (progress.unlocked[input.nodeId]) {
      const existingUnlock = progress.unlocked[input.nodeId]!;
      return {
        success: true,
        data: {
          nodeId: input.nodeId,
          unlockedAt: existingUnlock.unlockedAt
        },
        message: 'Node already unlocked'
      };
    }

    const unlockedAt = Date.now();
    progress.unlocked[input.nodeId] = { unlockedAt };
    await progressRepo.upsertProgress(progress);

    return {
      success: true,
      data: { nodeId: input.nodeId, unlockedAt },
      message: 'Node unlocked'
    };
  }

  async updateProgress(
    userId: number,
    mapId: string,
    mapVersion: string,
    unlocked: unknown
  ): Promise<ApiResponse<UserProgressDocument>> {
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

    if (!mapVersion.trim()) {
      return {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'invalid mapVersion' }
      };
    }

    if (!isUnlockedDocument(unlocked)) {
      return {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'invalid unlocked document' }
      };
    }

    const saved = await progressRepo.upsertProgress({
      userId,
      mapId,
      mapVersion,
      unlocked
    });

    return { success: true, data: saved, message: 'updated' };
  }
}

export const progressService = new ProgressService();

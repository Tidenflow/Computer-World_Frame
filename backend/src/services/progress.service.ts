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

import { prisma } from '../lib/prisma';
import type { UserProgressDocument } from '@shared/map-document';

export class ProgressRepo {
  async findByUserMapVersion(
    userId: number,
    mapId: string,
    mapVersion: string
  ): Promise<UserProgressDocument | null> {
    const record = await prisma.userProgress.findUnique({
      where: {
        uk_user_map_version: {
          userId,
          mapId,
          mapVersion
        }
      }
    });

    return (record?.progressJson as UserProgressDocument | null) ?? null;
  }

  async upsertProgress(progress: UserProgressDocument): Promise<UserProgressDocument> {
    await prisma.userProgress.upsert({
      where: {
        uk_user_map_version: {
          userId: progress.userId,
          mapId: progress.mapId,
          mapVersion: progress.mapVersion
        }
      },
      update: {
        progressJson: progress as unknown as object
      },
      create: {
        userId: progress.userId,
        mapId: progress.mapId,
        mapVersion: progress.mapVersion,
        progressJson: progress as unknown as object
      }
    });

    return progress;
  }
}

export const progressRepo = new ProgressRepo();

import { prisma } from '../lib/prisma';
import type { CWFrameProgress } from '@shared/contract';

export class ProgressRepo {
  async findByUserId(userId: number): Promise<CWFrameProgress | null> {
    const records = await prisma.userProgress.findMany({
      where: { userId }
    });

    if (records.length === 0) return null;

    const unlockedNodes: CWFrameProgress['unlockedNodes'] = {};
    for (const record of records) {
      unlockedNodes[record.nodeId] = {
        unlockedAt: record.unlockedAt.getTime()
      };
    }

    return { userId, unlockedNodes };
  }

  async upsertByUserId(progress: CWFrameProgress): Promise<CWFrameProgress> {
    await prisma.userProgress.deleteMany({
      where: { userId: progress.userId }
    });

    const records = Object.entries(progress.unlockedNodes).map(([nodeId, info]) => ({
      userId: progress.userId,
      nodeId: parseInt(nodeId),
      unlockedAt: new Date(info.unlockedAt)
    }));

    if (records.length > 0) {
      await prisma.userProgress.createMany({ data: records });
    }

    return progress;
  }
}

export const progressRepo = new ProgressRepo();

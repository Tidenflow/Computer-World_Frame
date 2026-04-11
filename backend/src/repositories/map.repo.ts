import { prisma } from '../lib/prisma';
import type { CWFrameMapPayload } from '@shared/contract';

export class MapRepo {
  async getDefaultMap(): Promise<CWFrameMapPayload | null> {
    const record = await prisma.mapDocumentRecord.findFirst({
      where: {
        mapId: 'computer-world',
        status: 'published'
      },
      include: {
        projection: true
      },
      orderBy: {
        publishedAt: 'desc'
      }
    });

    if (!record || !record.projection) return null;

    return {
      document: record.documentJson as unknown as CWFrameMapPayload['document'],
      projection: record.projection.projectionJson as unknown as CWFrameMapPayload['projection']
    };
  }
}

export const mapRepo = new MapRepo();

import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../lib/prisma';
import type { CWFrameMapPayload } from '@shared/contract';
import type { MapDocument } from '@shared/map-document';
import { buildValidatedProjection } from '../scripts/build-map-projection';

async function loadFallbackDefaultMap(): Promise<CWFrameMapPayload> {
  const filePath = path.resolve(__dirname, '../data/maps/default.map.json');
  const raw = await fs.readFile(filePath, 'utf8');
  const document = JSON.parse(raw) as MapDocument;

  return {
    document,
    projection: buildValidatedProjection(document)
  };
}

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

    if (!record || !record.projection) {
      return loadFallbackDefaultMap();
    }

    return {
      document: record.documentJson as unknown as CWFrameMapPayload['document'],
      projection: record.projection.projectionJson as unknown as CWFrameMapPayload['projection']
    };
  }
}

export const mapRepo = new MapRepo();

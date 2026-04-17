import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../lib/prisma';
import type { CWFrameMapPayload } from '@shared/contract';
import type { MapDocument } from '@shared/map-document';
import { buildValidatedProjection } from '../scripts/build-map-projection';
import { MAP_REGISTRY } from '../data/maps/index';

const MAPS_DIR = path.resolve(__dirname, '../data/maps');

async function loadMapFromJson(mapId: string): Promise<CWFrameMapPayload | null> {
  const entry = MAP_REGISTRY[mapId];
  if (!entry) {
    console.warn(`[mapRepo] No registry entry for mapId="${mapId}"`);
    return null;
  }

  const filePath = path.join(MAPS_DIR, entry.file);
  let raw: string;

  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    console.error(`[mapRepo] Failed to read map file "${filePath}":`, err);
    return null;
  }

  let document: MapDocument;
  try {
    document = JSON.parse(raw) as MapDocument;
  } catch (err) {
    console.error(`[mapRepo] Failed to parse JSON for mapId="${mapId}":`, err);
    return null;
  }

  try {
    return {
      document,
      projection: buildValidatedProjection(document),
    };
  } catch (err) {
    console.error(`[mapRepo] Failed to build projection for mapId="${mapId}":`, err);
    return null;
  }
}

export class MapRepo {
  async getMapById(mapId: string): Promise<CWFrameMapPayload | null> {
    const record = await prisma.mapDocumentRecord.findFirst({
      where: {
        mapId,
        status: 'published',
      },
      include: {
        projection: true,
      },
      orderBy: {
        publishedAt: 'desc',
      },
    });

    if (record && record.projection) {
      return {
        document: record.documentJson as unknown as CWFrameMapPayload['document'],
        projection: record.projection.projectionJson as unknown as CWFrameMapPayload['projection'],
      };
    }

    return loadMapFromJson(mapId);
  }

  async getDefaultMap(): Promise<CWFrameMapPayload | null> {
    return this.getMapById('computer-world');
  }
}

export const mapRepo = new MapRepo();

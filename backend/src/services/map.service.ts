import fs from 'node:fs/promises';
import path from 'node:path';
import type { GetMapResponse, GetMapListResponse, MapListItem } from '@shared/contract';
import { mapRepo } from '../repositories/map.repo';
import { MAP_REGISTRY } from '../data/maps/index';

const MAPS_DIR = path.resolve(__dirname, '../data/maps');

export class MapService {
  async getMapList(): Promise<GetMapListResponse> {
    try {
      const items: MapListItem[] = await Promise.all(
        Object.entries(MAP_REGISTRY).map(async ([mapId, entry]) => {
          let nodeCount = 0;
          try {
            const raw = await fs.readFile(path.join(MAPS_DIR, entry.file), 'utf8');
            const doc = JSON.parse(raw);
            nodeCount = Array.isArray(doc.nodes) ? doc.nodes.length : 0;
          } catch {
            // ignore — nodeCount stays 0
          }
          return {
            mapId,
            title: entry.title,
            nodeCount,
            parentMapId: entry.parent,
          } satisfies MapListItem;
        })
      );
      return { success: true, data: items, message: 'ok' };
    } catch {
      return {
        success: false,
        data: null,
        error: { code: 'SERVER_ERROR', message: 'failed to load map list' },
      };
    }
  }

  async getMapById(mapId: string): Promise<GetMapResponse> {
    const map = await mapRepo.getMapById(mapId);
    if (!map) {
      return {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: `map "${mapId}" not found` },
      };
    }

    return {
      success: true,
      data: map,
      message: 'ok',
    };
  }

  async getDefaultMap(): Promise<GetMapResponse> {
    return this.getMapById('computer-world');
  }
}

export const mapService = new MapService();

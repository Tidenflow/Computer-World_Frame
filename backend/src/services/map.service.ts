import type { GetMapResponse } from '@shared/contract';
import { mapRepo } from '../repositories/map.repo';

export class MapService {
  async getDefaultMap(): Promise<GetMapResponse> {
    const map = await mapRepo.getDefaultMap();
    if (!map) {
      return {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'default map not found' },
      };
    }

    return {
      success: true,
      data: map,
      message: 'ok',
    };
  }
}

export const mapService = new MapService();



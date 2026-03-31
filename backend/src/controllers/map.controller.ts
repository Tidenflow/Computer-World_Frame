import type { Request, Response } from 'express';
import { mapService } from '../services/map.service';
import { statusByErrorCode } from '../utils/error-status';

export class MapController {
  async getDefaultMap(_req: Request, res: Response): Promise<void> {
    const result = await mapService.getDefaultMap();
    if (!result.success) {
      res.status(statusByErrorCode(result.error.code)).json(result);
      return;
    }
    res.status(200).json(result);
  }
}

export const mapController = new MapController();

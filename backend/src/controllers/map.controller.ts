import type { Request, Response } from 'express';
import { mapService } from '../services/map.service';
import { statusByErrorCode } from '../utils/error-status';

export class MapController {
  async getMapList(_req: Request, res: Response): Promise<void> {
    const result = await mapService.getMapList();
    if (!result.success) {
      res.status(statusByErrorCode(result.error.code)).json(result);
      return;
    }
    res.status(200).json(result);
  }

  async getMapById(req: Request, res: Response): Promise<void> {
    let mapId = req.params.mapId;

    if (req.path === '/default' || !mapId) {
      mapId = 'computer-world';
    }

    const result = await mapService.getMapById(mapId);
    if (!result.success) {
      res.status(statusByErrorCode(result.error.code)).json(result);
      return;
    }
    res.status(200).json(result);
  }
}

export const mapController = new MapController();

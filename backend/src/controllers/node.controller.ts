import { Request, Response } from 'express';
import { nodeService } from '../services/node.service';
import { asyncHandler } from '../utils/async-handler';

export const nodeController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const result = await nodeService.getAllNodes();
    res.json(result);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const nodeId = Array.isArray(req.params.id) ? req.params.id[0] ?? '' : req.params.id ?? '';
    const result = await nodeService.getNodeById(nodeId);
    res.json(result);
  })
};

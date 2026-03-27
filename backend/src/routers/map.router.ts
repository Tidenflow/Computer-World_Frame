import { Router } from 'express';
import { mapController } from '../controllers/map.controller';
import { asyncHandler } from '../utils/async-handler';

const mapRouter = Router();

mapRouter.get('/default', asyncHandler(async (req, res) => {
  await mapController.getDefaultMap(req, res);
}));

export default mapRouter;

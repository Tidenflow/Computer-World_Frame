import { Router } from 'express';
import { mapController } from '../controllers/map.controller';
import { asyncHandler } from '../utils/async-handler';

const mapRouter = Router();

/** 获取所有地图列表 */
mapRouter.get('/list', asyncHandler(async (req, res) => {
  await mapController.getMapList(req, res);
}));

/** @deprecated 保持向后兼容，必须写在 /:mapId 之前，否则 /default 会被捕获为 mapId=default */
mapRouter.get('/default', asyncHandler(async (req, res) => {
  await mapController.getMapById(req, res);
}));

/** 获取指定地图（含 projection）*/
mapRouter.get('/:mapId', asyncHandler(async (req, res) => {
  await mapController.getMapById(req, res);
}));

export default mapRouter;

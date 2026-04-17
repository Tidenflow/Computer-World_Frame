/**
 * 本文件职责：负责加载 CWFrame 的"地图"数据。
 *
 * 说明：
 * - 支持加载指定地图（通过 fetchMapById）
 * - 进度逻辑已移至 `progress.store.ts` 统一管理
 */
import type { CWFrameMapPayload } from '@shared/contract';
import { fetchDefaultMap, fetchMapById } from './cwframe.api';

/**
 * 加载默认知识图谱（地图）。
 *
 * @returns 默认地图对象（包含 document 和 projection）
 * @throws 当后端返回失败时，`fetchDefaultMap` 会抛出 Error
 */
export async function loadFrameMap(): Promise<CWFrameMapPayload> {
  return fetchDefaultMap();
}

/**
 * 加载指定地图。
 *
 * @param mapId - 地图 ID
 * @returns 地图对象（包含 document 和 projection）
 * @throws 当后端返回失败时抛出 Error
 */
export async function loadMapById(mapId: string): Promise<CWFrameMapPayload> {
  return fetchMapById(mapId);
}

/**
 * 本文件职责：负责加载 CWFrame 的”地图”数据。
 *
 * 说明：
 * - 当前仅实现”默认地图”的加载
 * - 进度逻辑已移至 `progress.store.ts` 统一管理
 */
import type { CWFrameMapPayload } from '@shared/contract';
import { fetchDefaultMap } from './cwframe.api';

/**
 * 加载默认知识图谱（地图）。
 *
 * @returns 默认地图对象（包含 document 和 projection）
 * @throws 当后端返回失败时，`fetchDefaultMap` 会抛出 Error
 */
export async function loadFrameMap(): Promise<CWFrameMapPayload> {
  return fetchDefaultMap();
}

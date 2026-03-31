// 本文件的职责是 ： 负责加载数据
import type { CWFrameMap } from '@shared/contract';
import { fetchDefaultMap } from './cwframe.api';

// 加载默认地图  --Loader函数
export async function loadFrameMap(): Promise<CWFrameMap> {
  return fetchDefaultMap();
}

// 进度逻辑已移至 store 统一管理

// 本文件的职责是 ： 负责加载数据
import type { CWFrameMap, CWFrameProgress } from '@shared/contract';
import { fetchDefaultMap, fetchProgress, getCurrentUserId, updateProgress } from './cwframe.api';

// 加载默认地图  --Loader函数
export async function loadFrameMap(): Promise<CWFrameMap> {
  return fetchDefaultMap();
}

// 加载进度  --Loader函数
export async function loadProgress(): Promise<CWFrameProgress> {
  const userId = getCurrentUserId();
  return fetchProgress(userId);
}

// 保存进度  --Loader函数
export async function saveProgress(progress: CWFrameProgress): Promise<CWFrameProgress> {
  return updateProgress(progress.userId, progress);
}

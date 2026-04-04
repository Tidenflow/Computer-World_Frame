import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import type { CWFrameProgress, CWFrameNode } from '@shared/contract';
import * as api from '../core/cwframe.api';
import { unlockNode as localUnlockNode } from '../core/cwframe.progress';
import { useUserStore } from './user.store';

/**
 * 用户进度仓库：负责加载/更新“点亮记录”（unlockedNodes）。
 *
 * 注意：
 * - `progress` 是 reactive 对象，会被 actions 原地修改
 * - 与服务端同步目前使用覆盖式 `PUT`（写回 unlockedNodes）
 */
export const useProgressStore = defineStore('progress', () => {
  const userStore = useUserStore();

  const progress = reactive<CWFrameProgress>({
    userId: userStore.userId,
    unlockedNodes: {}
  });

  const isLoaded = ref<boolean>(false);

  // Getters
  /**
   * 已解锁节点数量（用于 UI 统计）。
   *
   * @returns number
   */
  const unlockedNodesCount = computed(() => Object.keys(progress.unlockedNodes).length);

  // Actions
  /**
   * 从服务端加载当前用户进度，并写入到本地 `progress`。
   *
   * @returns Promise<void>（无返回值；失败时只会在控制台打印错误）
   *
   * @sideEffects
   * - 会覆盖 `progress.unlockedNodes`
   * - 会设置 `isLoaded=true`
   */
  async function loadProgress(): Promise<void> {
    if (!userStore.userId) return;
    
    try {
      const data = await api.fetchProgress(userStore.userId);
      progress.userId = data.userId;
      // Reset and re-assign
      progress.unlockedNodes = {};
      Object.assign(progress.unlockedNodes, data.unlockedNodes);
      isLoaded.value = true;
    } catch (error) {
      console.error('Failed to load progress from server:', error);
    }
  }

  /**
   * 解锁指定节点，并同步到服务端。
   *
   * @param node - 要解锁的节点
   * @param matchedTerm - 可选：触发本次解锁的“用户输入词”，用于历史记录展示
   * @returns 一个轻量结果对象，供 UI toast/提示使用
   *
   * @sideEffects
   * - 会修改 `progress.unlockedNodes`
   * - 会发起网络请求写回服务端（失败时会返回 success:false）
   */
  async function unlockNode(
    node: CWFrameNode,
    matchedTerm?: string
  ): Promise<{ success: boolean; message: string }> {
    // 1. 本地更新
    localUnlockNode(progress, node);
    
    // 显式记录匹配词，用于历史记录展示
    if (matchedTerm && progress.unlockedNodes[node.id]) {
        (progress.unlockedNodes[node.id] as any).matchedTerm = matchedTerm;
    }

    // 2. 同步到服务端，确保下次刷新不会“复活”
    try {
      if (userStore.userId) {
        await api.updateProgress(userStore.userId, progress);
      }
      return { success: true, message: `已点亮: ${node.label}` };
    } catch (error) {
      console.error('同步进度至服务端失败:', error);
      return { success: false, message: '进度同步失败' };
    }
  }

  /**
   * 清空本地进度，并尝试同步清空服务端进度。
   *
   * @returns Promise<void>
   *
   * @sideEffects
   * - 会重置 `progress.unlockedNodes = {}`
   * - 会调用服务端 `PUT /progress` 写回空对象（若 userId 存在）
   */
  async function resetLocalProgress(): Promise<void> {
    progress.unlockedNodes = {};
    // 同步清空服务端进度
    if (userStore.userId) {
      try {
        await api.updateProgress(userStore.userId, { 
          userId: userStore.userId, 
          unlockedNodes: {} 
        });
      } catch (error) {
        console.error('重置服务端进度失败:', error);
      }
    }
  }

  return {
    progress,
    isLoaded,
    unlockedNodesCount,
    loadProgress,
    unlockNode,
    resetLocalProgress
  };
});

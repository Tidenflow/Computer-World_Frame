import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import type { CWFrameProgress, CWFrameNode } from '@shared/contract';
import * as api from '../core/cwframe.api';
import { unlockNode as localUnlockNode } from '../core/cwframe.progress';
import { useUserStore } from './user.store';

export const useProgressStore = defineStore('progress', () => {
  const userStore = useUserStore();

  const progress = reactive<CWFrameProgress>({
    userId: userStore.userId,
    unlockedNodes: {}
  });

  const isLoaded = ref<boolean>(false);

  // Getters
  const unlockedNodesCount = computed(() => Object.keys(progress.unlockedNodes).length);

  // Actions
  async function loadProgress() {
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

  async function unlockNode(node: CWFrameNode, matchedTerm?: string) {
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

  async function resetLocalProgress() {
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

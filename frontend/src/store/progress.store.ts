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

  async function unlockNode(node: CWFrameNode) {
    // 1. Local update
    localUnlockNode(progress, node);

    // 2. Sync with server
    try {
      if (userStore.userId) {
        await api.updateProgress(userStore.userId, progress);
      }
      return { success: true, message: `已解锁: ${node.label}` };
    } catch (error) {
      console.error('Failed to sync progress with server:', error);
      return { success: false, message: '同步进度失败' };
    }
  }

  function resetLocalProgress() {
    progress.unlockedNodes = {};
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

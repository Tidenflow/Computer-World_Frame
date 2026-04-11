import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import type { CWFrameNodeDocument } from '@shared/contract';
import type { UserProgressDocument } from '@shared/map-document';
import * as api from '../core/cwframe.api';
import { useUserStore } from './user.store';
import { useMapStore } from './map.store';

export interface LatestUnlockEntry {
  nodeId: string;
  matchedTerm: string;
  unlockedAt: number;
}

export const useProgressStore = defineStore('progress', () => {
  const userStore = useUserStore();
  const mapStore = useMapStore();

  const progress = reactive<UserProgressDocument>({
    userId: userStore.userId,
    mapId: 'computer-world',
    mapVersion: '',
    unlocked: {}
  });

  const isLoaded = ref<boolean>(false);
  const latestInputEntries = ref<LatestUnlockEntry[]>([]);
  const latestInputText = ref<string>('');
  const hasLatestInput = ref<boolean>(false);
  const recentlyUnlockedIds = ref<string[]>([]);

  const unlockedNodesCount = computed(() => Object.keys(progress.unlocked).length);

  async function loadProgress(): Promise<void> {
    if (!userStore.userId || !api.hasActiveSession()) return;
    const currentMap = mapStore.frameMap;
    if (!currentMap) return;

    try {
      const data = await api.fetchProgress(
        userStore.userId,
        currentMap.document.mapId,
        currentMap.document.version
      );
      progress.userId = data.userId;
      progress.mapId = data.mapId;
      progress.mapVersion = data.mapVersion;
      progress.unlocked = {};
      Object.assign(progress.unlocked, data.unlocked);
      isLoaded.value = true;
    } catch (error) {
      console.error('Failed to load progress from server:', error);
    }
  }

  async function unlockNode(
    node: CWFrameNodeDocument,
    matchedTerm?: string
  ): Promise<{ success: boolean; message: string; isNewlyUnlocked: boolean }> {
    const wasAlreadyUnlocked = Boolean(progress.unlocked[node.id]);

    try {
      if (userStore.userId) {
        const result = await api.unlockProgressNode({
          userId: userStore.userId,
          mapId: progress.mapId,
          mapVersion: progress.mapVersion,
          nodeId: node.id,
          matchedTerm
        });
        progress.unlocked[node.id] = { unlockedAt: result.unlockedAt };
      } else if (!wasAlreadyUnlocked) {
        progress.unlocked[node.id] = { unlockedAt: Date.now() };
      }

      return {
        success: true,
        message: wasAlreadyUnlocked ? `已存在: ${node.title}` : `已点亮: ${node.title}`,
        isNewlyUnlocked: !wasAlreadyUnlocked
      };
    } catch (error) {
      console.error('同步进度至服务端失败:', error);
      return {
        success: false,
        message: '进度同步失败',
        isNewlyUnlocked: !wasAlreadyUnlocked
      };
    }
  }

  function setLatestInputResult(inputText: string, entries: LatestUnlockEntry[]): void {
    hasLatestInput.value = true;
    latestInputText.value = inputText;
    latestInputEntries.value = entries;
    recentlyUnlockedIds.value = entries.map(entry => entry.nodeId);
  }

  function clearLatestInputResult(): void {
    hasLatestInput.value = false;
    latestInputText.value = '';
    latestInputEntries.value = [];
    recentlyUnlockedIds.value = [];
  }

  async function resetLocalProgress(): Promise<void> {
    progress.unlocked = {};
    clearLatestInputResult();

    if (userStore.userId) {
      try {
        await api.updateProgress(userStore.userId, {
          userId: userStore.userId,
          mapId: progress.mapId,
          mapVersion: progress.mapVersion,
          unlocked: {}
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
    latestInputEntries,
    latestInputText,
    hasLatestInput,
    recentlyUnlockedIds,
    loadProgress,
    unlockNode,
    setLatestInputResult,
    clearLatestInputResult,
    resetLocalProgress
  };
});

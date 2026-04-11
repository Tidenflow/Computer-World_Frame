import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import type { CWFrameNodeDocument } from '@shared/contract';
import type { UserProgressDocument } from '@shared/map-document';
import * as api from '../core/cwframe.api';
import { useUserStore } from './user.store';
import { useMapStore } from './map.store';

export interface LatestUnlockEntry {
  nodeId: number;
  matchedTerm: string;
  unlockedAt: number;
}

interface LatestInputSnapshot {
  inputText: string;
  entries: LatestUnlockEntry[];
}

/**
 * 用户进度仓库：负责加载/更新“点亮记录”（unlockedNodes）。
 *
 * 注意：
 * - `progress` 是 reactive 对象，会被 actions 原地修改
 * - 与服务端同步目前使用覆盖式 `PUT`（写回 unlockedNodes）
 */
export const useProgressStore = defineStore('progress', () => {
  const userStore = useUserStore();
<<<<<<< HEAD
  const latestInputStorageKey = computed(
    () => `cwframe_latest_input_result_${userStore.userId || 'guest'}`
  );
=======
  const mapStore = useMapStore();
>>>>>>> 46e04ac (refactor: consume document-based maps in frontend)

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
  const recentlyUnlockedIds = ref<number[]>([]);

  // Getters
  /**
   * 已解锁节点数量（用于 UI 统计）。
   *
   * @returns number
   */
  const unlockedNodesCount = computed(() => Object.keys(progress.unlocked).length);

  function persistLatestInputResult(): void {
    if (!hasLatestInput.value) {
      localStorage.removeItem(latestInputStorageKey.value);
      return;
    }

    const payload: LatestInputSnapshot = {
      inputText: latestInputText.value,
      entries: latestInputEntries.value
    };

    localStorage.setItem(latestInputStorageKey.value, JSON.stringify(payload));
  }

  function hydrateLatestInputResult(): void {
    const raw = localStorage.getItem(latestInputStorageKey.value);
    if (!raw) {
      clearLatestInputResult(false);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<LatestInputSnapshot>;
      const parsedEntries = Array.isArray(parsed.entries) ? parsed.entries : [];

      const validEntries = parsedEntries.filter(entry => {
        const unlockedInfo = progress.unlockedNodes[entry.nodeId];
        return Boolean(
          unlockedInfo &&
          typeof entry.matchedTerm === 'string' &&
          typeof entry.unlockedAt === 'number'
        );
      });

      if (!parsed.inputText || validEntries.length !== parsedEntries.length) {
        clearLatestInputResult();
        return;
      }

      hasLatestInput.value = true;
      latestInputText.value = parsed.inputText;
      latestInputEntries.value = validEntries;
      recentlyUnlockedIds.value = validEntries.map(entry => entry.nodeId);
    } catch (error) {
      console.error('恢复最近一次输入结果失败:', error);
      clearLatestInputResult();
    }
  }

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
    const currentMap = mapStore.frameMap;
    if (!currentMap) return;
    
    try {
      const data = await api.fetchProgress(
        userStore.userId,
        currentMap.document.mapId,
        currentMap.document.version
      );
      progress.userId = data.userId;
<<<<<<< HEAD
      // Reset and re-assign
      progress.unlockedNodes = {};
      Object.assign(progress.unlockedNodes, data.unlockedNodes);
      hydrateLatestInputResult();
=======
      progress.mapId = data.mapId;
      progress.mapVersion = data.mapVersion;
      progress.unlocked = {};
      Object.assign(progress.unlocked, data.unlocked);
>>>>>>> 46e04ac (refactor: consume document-based maps in frontend)
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
    node: CWFrameNodeDocument,
    matchedTerm?: string
<<<<<<< HEAD
  ): Promise<{ success: boolean; message: string; isNewlyUnlocked: boolean }> {
    const wasAlreadyUnlocked = Boolean(progress.unlockedNodes[node.id]);

    // 1. 本地更新
    localUnlockNode(progress, node);
    
    // 显式记录匹配词，用于历史记录展示
    if (matchedTerm && progress.unlockedNodes[node.id]) {
      (progress.unlockedNodes[node.id] as any).matchedTerm = matchedTerm;
    }

    // 2. 同步到服务端，确保下次刷新不会“复活”
    try {
      if (userStore.userId && !wasAlreadyUnlocked) {
        await api.updateProgress(userStore.userId, progress);
      }
      return {
        success: true,
        message: wasAlreadyUnlocked ? `已存在: ${node.label}` : `已点亮: ${node.label}`,
        isNewlyUnlocked: !wasAlreadyUnlocked
      };
=======
  ): Promise<{ success: boolean; message: string }> {
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
      }
      return { success: true, message: `已点亮: ${node.title}` };
>>>>>>> 46e04ac (refactor: consume document-based maps in frontend)
    } catch (error) {
      console.error('同步进度至服务端失败:', error);
      return { success: false, message: '进度同步失败', isNewlyUnlocked: !wasAlreadyUnlocked };
    }
  }

  function setLatestInputResult(inputText: string, entries: LatestUnlockEntry[]): void {
    hasLatestInput.value = true;
    latestInputText.value = inputText;
    latestInputEntries.value = entries;
    recentlyUnlockedIds.value = entries.map(entry => entry.nodeId);
    persistLatestInputResult();
  }

  function clearLatestInputResult(shouldPersist = true): void {
    hasLatestInput.value = false;
    latestInputText.value = '';
    latestInputEntries.value = [];
    recentlyUnlockedIds.value = [];

    if (shouldPersist) {
      persistLatestInputResult();
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
<<<<<<< HEAD
    progress.unlockedNodes = {};
    clearLatestInputResult();
    // 同步清空服务端进度
=======
    progress.unlocked = {};
>>>>>>> 46e04ac (refactor: consume document-based maps in frontend)
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

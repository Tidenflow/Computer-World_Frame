import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import type { UserProgressDocument, MapNodeDocument } from '@shared/contract';
import * as api from '../core/cwframe.api';
import { unlockNode as localUnlockNode } from '../core/cwframe.progress';
import { useUserStore } from './user.store';

export interface LatestUnlockEntry {
  nodeId: string;
  matchedTerm: string;
  unlockedAt: number;
}

export interface UndoEntry {
  nodeId: string;
  unlockedAt: number;
}

interface LatestInputSnapshot {
  inputText: string;
  entries: LatestUnlockEntry[];
}

export const useProgressStore = defineStore('progress', () => {
  const userStore = useUserStore();
  const latestInputStorageKey = computed(
    () => `cwframe_latest_input_result_${userStore.userId || 'guest'}`
  );
  const undoStackStorageKey = computed(
    () => `cwframe_undo_stack_${userStore.userId || 'guest'}`
  );

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
  const undoStack = ref<UndoEntry[]>([]);
  const MAX_UNDO_STACK = 50;

  /**
   * 最近一次点亮成功的节点（用于 HUD 撤销/重置状态判断）
   * 注意：这是独立于 undoStack 的"当前激活节点"状态
   * - 点亮节点时更新为此节点
   * - 撤销时回退到 undoStack 栈顶
   * - 重置时置为 null
   */
  const lastActivatedEntry = ref<LatestUnlockEntry | null>(null);

  // Getters
  const unlockedNodesCount = computed(() => Object.keys(progress.unlocked).length);

  const undoCount = computed(() => undoStack.value.length);

  // Persistence helpers
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

  function persistUndoStack(): void {
    try {
      localStorage.setItem(undoStackStorageKey.value, JSON.stringify(undoStack.value.slice(-MAX_UNDO_STACK)));
    } catch {
      // localStorage unavailable, silent ignore
    }
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
        const unlockedInfo = progress.unlocked[entry.nodeId];
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
      // 恢复最近激活节点（栈顶）
      if (validEntries.length > 0) {
        const last = validEntries[validEntries.length - 1];
        lastActivatedEntry.value = last;
      }
    } catch {
      clearLatestInputResult();
    }
  }

  function hydrateUndoStack(): void {
    try {
      const raw = localStorage.getItem(undoStackStorageKey.value);
      if (!raw) return;
      const parsed = JSON.parse(raw) as UndoEntry[];
      if (Array.isArray(parsed)) {
        undoStack.value = parsed.slice(-MAX_UNDO_STACK);
      }
    } catch {
      undoStack.value = [];
    }
  }

  // Actions
  async function loadProgress(): Promise<void> {
    if (!userStore.userId) return;
    try {
      const data = await api.fetchProgress(userStore.userId);
      progress.userId = data.userId;
      progress.mapId = data.mapId;
      progress.mapVersion = data.mapVersion;
      progress.unlocked = {};
      Object.assign(progress.unlocked, data.unlocked);
      hydrateLatestInputResult();
      hydrateUndoStack();
      isLoaded.value = true;
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  }

  async function unlockNode(
    node: MapNodeDocument,
    matchedTerm?: string
  ): Promise<{ success: boolean; message: string; isNewlyUnlocked: boolean }> {
    const wasAlreadyUnlocked = Boolean(progress.unlocked[node.id]);

    // 1. Local update
    localUnlockNode(progress, node);

    // 2. Push to undo stack
    const entry: UndoEntry = { nodeId: node.id, unlockedAt: Date.now() };
    undoStack.value.push(entry);
    if (undoStack.value.length > MAX_UNDO_STACK) {
      undoStack.value.shift();
    }

    // 3. 更新最近激活节点
    lastActivatedEntry.value = {
      nodeId: node.id,
      matchedTerm: matchedTerm || '',
      unlockedAt: entry.unlockedAt
    };

    persistUndoStack();

    // 3. Sync to server
    try {
      if (userStore.userId && !wasAlreadyUnlocked) {
        await api.updateProgress(userStore.userId, progress);
      }
      return {
        success: true,
        message: wasAlreadyUnlocked ? `Already unlocked: ${node.title}` : `Unlocked: ${node.title}`,
        isNewlyUnlocked: !wasAlreadyUnlocked
      };
    } catch (error) {
      console.error('Sync progress failed:', error);
      return { success: false, message: 'Sync failed', isNewlyUnlocked: !wasAlreadyUnlocked };
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
    if (shouldPersist) persistLatestInputResult();
  }

  async function resetLocalProgress(): Promise<void> {
    progress.unlocked = {};
    clearLatestInputResult();
    undoStack.value = [];
    lastActivatedEntry.value = null;
    persistUndoStack();
    if (userStore.userId) {
      try {
        await api.updateProgress(userStore.userId, {
          userId: userStore.userId,
          mapId: progress.mapId,
          mapVersion: progress.mapVersion,
          unlocked: {}
        });
      } catch (error) {
        console.error('Reset progress failed:', error);
      }
    }
  }

  /**
   * 撤销最近一次点亮（将栈顶弹出并从 unlocked 中移除）
   *
   * @sideEffects 会将 lastActivatedEntry 回退到新的栈顶
   */
  function undo(): { nodeId: string | null } {
    if (undoStack.value.length === 0) return { nodeId: null };

    const popped = undoStack.value.pop()!;
    delete progress.unlocked[popped.nodeId];
    persistUndoStack();

    // 清空 latestInput（幂等）
    if (undoStack.value.length === 0) {
      clearLatestInputResult();
      lastActivatedEntry.value = null;
    } else {
      // 栈非空：回退到新的栈顶
      const newTop = undoStack.value[undoStack.value.length - 1];
      lastActivatedEntry.value = {
        nodeId: newTop.nodeId,
        matchedTerm: '',
        unlockedAt: newTop.unlockedAt
      };
    }

    // 返回被撤销的节点 ID（供 HUD 聚焦用）
    return { nodeId: popped.nodeId };
  }

  return {
    progress,
    isLoaded,
    unlockedNodesCount,
    latestInputEntries,
    latestInputText,
    hasLatestInput,
    recentlyUnlockedIds,
    undoStack,
    lastActivatedEntry,
    undoCount,
    loadProgress,
    unlockNode,
    setLatestInputResult,
    clearLatestInputResult,
    resetLocalProgress,
    undo
  };
});

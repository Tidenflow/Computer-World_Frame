import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CWFrameMap, CWFrameNode } from '@shared/contract';
import * as loader from '../core/cwframe.loader';
import { buildVisibilityMap } from '../core/cwframe.visibility';
import { useProgressStore } from './progress.store';

/**
 * 地图（知识图谱）仓库：负责加载地图、维护选中节点，以及根据 progress 计算节点状态。
 */
export const useMapStore = defineStore('map', () => {
  const progressStore = useProgressStore();

  /**
   * 当前加载的知识图谱（未加载时为 null）。
   */
  const frameMap = ref<CWFrameMap | null>(null);

  /**
   * 当前选中的节点 id（未选中时为 null）。
   */
  const selectedNodeId = ref<number | null>(null);
  const focusRequest = ref<{ nodeId: number; requestedAt: number } | null>(null);

  const visibilityMap = computed(() => {
    if (!frameMap.value) return {};
    return buildVisibilityMap(frameMap.value, progressStore.progress);
  });

  /**
   * 当前选中的节点对象（由 `selectedNodeId` 反查 `frameMap.nodes`）。
   *
   * @returns CWFrameNode | null
   */
  const selectedNode = computed<CWFrameNode | null>(() => {
    if (!frameMap.value || selectedNodeId.value === null) return null;
    return frameMap.value.nodes.find(n => n.id === selectedNodeId.value) ?? null;
  });

  /**
   * 加载默认地图（从服务端拉取）。
   *
   * @returns Promise<CWFrameMap> 加载到的地图对象
   * @throws loader.loadFrameMap 失败时会抛出异常（上层可 catch 展示错误 UI）
   *
   * @sideEffects 会写入 `frameMap.value`
   */
  async function loadMap(): Promise<CWFrameMap> {
    try {
      const map = await loader.loadFrameMap();
      frameMap.value = map;
      return map;
    } catch (error) {
      console.error('Failed to load frame map:', error);
      throw error;
    }
  }

  /**
   * 切换选中节点（重复点击同一节点会取消选中）。
   *
   * @param id - 目标节点 id；传 null 表示清空选中
   * @returns void
   *
   * @sideEffects 会修改 `selectedNodeId.value`
   */
  function selectNode(id: number | null): void {
    selectedNodeId.value = selectedNodeId.value === id ? null : id;
  }

  function openNode(id: number | null): void {
    selectedNodeId.value = id;
  }

  function focusNode(id: number): void {
    focusRequest.value = { nodeId: id, requestedAt: Date.now() };
  }

  return {
    frameMap,
    selectedNodeId,
    focusRequest,
    visibilityMap,
    selectedNode,
    loadMap,
    selectNode,
    openNode,
    focusNode
  };
});

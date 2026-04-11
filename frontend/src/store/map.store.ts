import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CWFrameMapPayload, CWFrameNodeDocument } from '@shared/contract';
import * as loader from '../core/cwframe.loader';
import { buildStatusMap } from '../core/cwframe.status';
import { useProgressStore } from './progress.store';

/**
 * 地图（知识图谱）仓库：负责加载地图、维护选中节点，以及根据 progress 计算节点状态。
 */
export const useMapStore = defineStore('map', () => {
  const progressStore = useProgressStore();

  /**
   * 当前加载的知识图谱（未加载时为 null）。
   */
  const frameMap = ref<CWFrameMapPayload | null>(null);

  /**
   * 当前选中的节点 id（未选中时为 null）。
   */
  const selectedNodeId = ref<string | null>(null);

  /**
   * 节点状态映射表：由 `frameMap` 与 `progressStore.progress` 计算得出。
   *
   * @returns Record<nodeId, 'Locked' | 'Discoverable' | 'Unlocked'>
   */
  const statusMap = computed(() => {
    if (!frameMap.value) return {};
    return buildStatusMap(frameMap.value, progressStore.progress);
  });

  /**
   * 当前选中的节点对象（由 `selectedNodeId` 反查 `projection.nodeById`）。
   *
   * @returns CWFrameNodeDocument | null
   */
  const selectedNode = computed<CWFrameNodeDocument | null>(() => {
    if (!frameMap.value || selectedNodeId.value === null) return null;
    return frameMap.value.projection.nodeById[selectedNodeId.value] ?? null;
  });

  /**
   * 加载默认地图（从服务端拉取）。
   *
   * @returns Promise<CWFrameMapPayload> 加载到的地图文档与派生投影
   * @throws loader.loadFrameMap 失败时会抛出异常（上层可 catch 展示错误 UI）
   *
   * @sideEffects 会写入 `frameMap.value`
   */
  async function loadMap(): Promise<CWFrameMapPayload> {
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
  function selectNode(id: string | null): void {
    selectedNodeId.value = selectedNodeId.value === id ? null : id;
  }

  return {
    frameMap,
    selectedNodeId,
    statusMap,
    selectedNode,
    loadMap,
    selectNode
  };
});

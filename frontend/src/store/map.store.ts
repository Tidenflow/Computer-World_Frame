import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CWFrameMapPayload, CWFrameNodeDocument } from '@shared/contract';
import * as loader from '../core/cwframe.loader';
import { buildStatusMap } from '../core/cwframe.status';
import { buildVisibilityMap } from '../core/cwframe.visibility';
import { useProgressStore } from './progress.store';

export const useMapStore = defineStore('map', () => {
  const progressStore = useProgressStore();

  const frameMap = ref<CWFrameMapPayload | null>(null);
  const selectedNodeId = ref<string | null>(null);
  const focusRequest = ref<{ nodeId: string; requestedAt: number } | null>(null);

  const statusMap = computed(() => {
    if (!frameMap.value) return {};
    return buildStatusMap(frameMap.value, progressStore.progress);
  });

  const visibilityMap = computed(() => {
    if (!frameMap.value) return {};
    return buildVisibilityMap(frameMap.value, progressStore.progress);
  });

  const selectedNode = computed<CWFrameNodeDocument | null>(() => {
    if (!frameMap.value || selectedNodeId.value === null) return null;
    return frameMap.value.projection.nodeById[selectedNodeId.value] ?? null;
  });

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

  function selectNode(id: string | null): void {
    selectedNodeId.value = selectedNodeId.value === id ? null : id;
  }

  function openNode(id: string | null): void {
    selectedNodeId.value = id;
  }

  function focusNode(id: string): void {
    focusRequest.value = { nodeId: id, requestedAt: Date.now() };
  }

  return {
    frameMap,
    selectedNodeId,
    focusRequest,
    statusMap,
    visibilityMap,
    selectedNode,
    loadMap,
    selectNode,
    openNode,
    focusNode
  };
});

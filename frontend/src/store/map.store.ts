import { defineStore } from 'pinia';
import { ref, computed, reactive } from 'vue';
import type { CWFrameMap, CWFrameNode } from '@shared/contract';
import * as loader from '../core/cwframe.loader';
import { buildStatusMap } from '../core/cwframe.status';
import { useProgressStore } from './progress.store';

export const useMapStore = defineStore('map', () => {
  const progressStore = useProgressStore();

  const frameMap = ref<CWFrameMap | null>(null);
  const selectedNodeId = ref<number | null>(null);

  // Compute status map based on current map and user progress
  const statusMap = computed(() => {
    if (!frameMap.value) return {};
    return buildStatusMap(frameMap.value, progressStore.progress);
  });

  // Selected node object
  const selectedNode = computed<CWFrameNode | null>(() => {
    if (!frameMap.value || selectedNodeId.value === null) return null;
    return frameMap.value.nodes.find(n => n.id === selectedNodeId.value) ?? null;
  });

  // Load the default map
  async function loadMap() {
    try {
      const map = await loader.loadFrameMap();
      frameMap.value = map;
      return map;
    } catch (error) {
      console.error('Failed to load frame map:', error);
      throw error;
    }
  }

  // Handle node clicking
  function selectNode(id: number | null) {
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

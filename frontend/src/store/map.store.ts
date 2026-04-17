import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CWFrameMapPayload, MapNodeDocument, MapListItem } from '@shared/contract';
import * as loader from '../core/cwframe.loader';
import { buildVisibilityMap } from '../core/cwframe.visibility';
import { useProgressStore } from './progress.store';
import { vectorCache } from '../core/vector-cache';
import { fetchMapList } from '../core/cwframe.api';

/**
 * 地图（知识图谱）仓库：负责加载地图、维护选中节点、地图切换，以及根据 progress 计算节点状态。
 */
export const useMapStore = defineStore('map', () => {
  const progressStore = useProgressStore();

  /**
   * 当前加载的知识图谱（未加载时为 null）。
   */
  const frameMap = ref<CWFrameMapPayload | null>(null);

  /**
   * 当前地图 ID（如 'computer-world'、'frontend' 等）。
   */
  const currentMapId = ref<string>('computer-world');

  /**
   * 可用地图列表（从后端获取）。
   */
  const availableMaps = ref<MapListItem[]>([]);

  /**
   * 当前选中的节点 id（未选中时为 null）。
   */
  const selectedNodeId = ref<string | null>(null);
  const focusRequest = ref<{ nodeId: string; requestedAt: number } | null>(null);

  /** 向量预计算进度（0-100），用于 UI 显示加载状态 */
  const vectorProgress = ref<{ done: number; total: number } | null>(null);

  /** 选中的领域（domain）集合，空集合表示显示所有领域 */
  const selectedDomains = ref<Set<string>>(new Set());

  /** 当前 3D 布局类型 */
  const layoutType = ref<'original' | 'sphere' | 'galaxy'>('original');

  const visibilityMap = computed(() => {
    if (!frameMap.value) return {};
    return buildVisibilityMap(frameMap.value, progressStore.progress);
  });

  /**
   * 当前选中的节点对象（由 `selectedNodeId` 反查 `frameMap.document.nodes`）。
   */
  const selectedNode = computed<MapNodeDocument | null>(() => {
    if (!frameMap.value || selectedNodeId.value === null) return null;
    return frameMap.value.document.nodes.find(n => n.id === selectedNodeId.value) ?? null;
  });

  /**
   * 当前地图标题（用于 UI 展示）。
   */
  const currentMapTitle = computed(() => {
    const found = availableMaps.value.find(m => m.mapId === currentMapId.value);
    return found?.title ?? currentMapId.value;
  });

  /**
   * 加载地图列表（从后端获取）。
   */
  async function loadMapList(): Promise<void> {
    try {
      const list = await fetchMapList();
      availableMaps.value = list;
    } catch (err) {
      console.warn('[mapStore] Failed to load map list:', err);
    }
  }

  /**
   * 加载默认地图（从服务端拉取）。
   *
   * @returns Promise<CWFrameMapPayload> 加载到的地图对象
   * @throws loader.loadFrameMap 失败时会抛出异常
   *
   * @sideEffects 会写入 `frameMap.value`，并在后台启动向量缓存预计算
   */
  async function loadMap(): Promise<CWFrameMapPayload> {
    try {
      const map = await loader.loadFrameMap();
      frameMap.value = map;
      currentMapId.value = map.document.mapId;

      const allIds = new Set(map.document.nodes.map(n => n.domain || 'default'));
      selectedDomains.value = allIds;

      if (map.document.version) {
        vectorCache.init(
          map.document.nodes,
          map.document.version,
          (done, total) => {
            vectorProgress.value = { done, total };
            if (done === total) vectorProgress.value = null;
          }
        );
      }

      return map;
    } catch (error) {
      console.error('Failed to load frame map:', error);
      throw error;
    }
  }

  /**
   * 切换到指定地图。
   *
   * @param mapId - 目标地图 ID
   * @returns 切换后的地图对象
   *
   * @sideEffects 会重置 vectorCache、selectedNodeId、selectedDomains，并重新 init 向量缓存
   */
  async function switchMap(mapId: string): Promise<CWFrameMapPayload> {
    if (mapId === currentMapId.value && frameMap.value) {
      return frameMap.value;
    }

    const map = await loader.loadMapById(mapId);
    frameMap.value = map;
    currentMapId.value = map.document.mapId;
    selectedNodeId.value = null;
    focusRequest.value = null;

    const allIds = new Set(map.document.nodes.map(n => n.domain || 'default'));
    selectedDomains.value = allIds;

    vectorCache.reset();
    if (map.document.version) {
      vectorCache.init(
        map.document.nodes,
        map.document.version,
        (done, total) => {
          vectorProgress.value = { done, total };
          if (done === total) vectorProgress.value = null;
        }
      );
    }

    return map;
  }

  /**
   * 切换选中节点（重复点击同一节点会取消选中）。
   */
  function selectNode(id: string | null): void {
    selectedNodeId.value = selectedNodeId.value === id ? null : id;
  }

  function openNode(id: string | null): void {
    selectedNodeId.value = id;
  }

  function focusNode(id: string): void {
    focusRequest.value = { nodeId: id, requestedAt: Date.now() };
  }

  /**
   * 切换领域的选中状态。
   */
  function toggleDomain(domainId: string): void {
    const newSet = new Set(selectedDomains.value);
    if (newSet.has(domainId)) {
      newSet.delete(domainId);
    } else {
      newSet.add(domainId);
    }
    selectedDomains.value = newSet;
  }

  function selectAllDomains(): void {
    if (!frameMap.value) return;
    const allIds = new Set(frameMap.value.document.nodes.map(n => n.domain || 'default'));
    selectedDomains.value = allIds;
  }

  function clearAllDomains(): void {
    selectedDomains.value = new Set();
  }

  function setLayoutType(type: 'original' | 'sphere' | 'galaxy'): void {
    layoutType.value = type;
  }

  return {
    frameMap,
    currentMapId,
    availableMaps,
    selectedNodeId,
    focusRequest,
    vectorProgress,
    visibilityMap,
    selectedNode,
    currentMapTitle,
    layoutType,
    loadMapList,
    loadMap,
    switchMap,
    selectNode,
    openNode,
    focusNode,
    toggleDomain,
    selectAllDomains,
    clearAllDomains,
    setLayoutType,
  };
});

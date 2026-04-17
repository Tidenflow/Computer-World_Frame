import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CWFrameMapPayload, MapNodeDocument } from '@shared/contract';
import * as loader from '../core/cwframe.loader';
import { buildVisibilityMap } from '../core/cwframe.visibility';
import { useProgressStore } from './progress.store';
import { vectorCache } from '../core/vector-cache';

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
  const focusRequest = ref<{ nodeId: string; requestedAt: number } | null>(null);

  /** 向量预计算进度（0-100），用于 UI 显示加载状态 */
  const vectorProgress = ref<{ done: number; total: number } | null>(null);

  /** 选中的领域（domain）集合，空集合表示显示所有领域 */
  const selectedDomains = ref<Set<string>>(new Set());

  /** 当前 3D 布局类型 */
  const layoutType = ref<'original' | 'sphere' | 'galaxy' | 'wave' | 'helix' | 'torus'>('original');

  const visibilityMap = computed(() => {
    if (!frameMap.value) return {};
    return buildVisibilityMap(frameMap.value, progressStore.progress);
  });

  /**
   * 当前选中的节点对象（由 `selectedNodeId` 反查 `frameMap.document.nodes`）。
   *
   * @returns MapNodeDocument | null
   */
  const selectedNode = computed<MapNodeDocument | null>(() => {
    if (!frameMap.value || selectedNodeId.value === null) return null;
    return frameMap.value.document.nodes.find(n => n.id === selectedNodeId.value) ?? null;
  });

  /**
   * 加载默认地图（从服务端拉取）。
   *
   * @returns Promise<CWFrameMapPayload> 加载到的地图对象
   * @throws loader.loadFrameMap 失败时会抛出异常（上层可 catch 展示错误 UI）
   *
   * @sideEffects 会写入 `frameMap.value`，并在后台启动向量缓存预计算
   */
  async function loadMap(): Promise<CWFrameMapPayload> {
    try {
      const map = await loader.loadFrameMap();
      frameMap.value = map;

      // 后台预计算所有节点向量（不阻塞主流程）
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

  function openNode(id: string | null): void {
    selectedNodeId.value = id;
  }

  function focusNode(id: string): void {
    focusRequest.value = { nodeId: id, requestedAt: Date.now() };
  }

  /**
   * 切换领域的选中状态。
   * @param domainId - 领域 id
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

  /**
   * 选中所有领域（把每个领域 id 都加入 Set，效果等同于显示全部）。
   */
  function selectAllDomains(): void {
    if (!frameMap.value) return;
    const allIds = new Set(frameMap.value.document.nodes.map(n => n.domain || 'default'));
    selectedDomains.value = allIds;
  }

  /**
   * 清除所有领域选中（清空 Set，取消过滤，显示所有）。
   */
  function clearAllDomains(): void {
    selectedDomains.value = new Set();
  }

  /**
   * 设置布局类型。
   * @param type - 布局类型
   */
  function setLayoutType(type: 'original' | 'sphere' | 'galaxy' | 'wave' | 'helix' | 'torus'): void {
    layoutType.value = type;
  }

  return {
    frameMap,
    selectedNodeId,
    focusRequest,
    vectorProgress,
    visibilityMap,
    selectedNode,
    selectedDomains,
    layoutType,
    loadMap,
    selectNode,
    openNode,
    focusNode,
    toggleDomain,
    selectAllDomains,
    clearAllDomains,
    setLayoutType
  };
});

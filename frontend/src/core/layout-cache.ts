/**
 * 布局缓存层
 * 
 * 目标：避免每次 visibilityMap 变化时重算整个树布局
 * - 缓存键：基于节点 IDs 和 deps 结构的哈希
 * - 缓存内容：layoutGraphTree 的计算结果
 * - 失效机制：当 deps 结构变化时清除缓存
 */

import type { MapNodeDocument } from '@shared/contract';
import type { TreeLayoutResult } from './cwframe.layout';
import { layoutGraphTree } from './cwframe.layout';
import { VIEWBOX_WIDTH, VIEWBOX_HEIGHT } from './layout-coordinator';

export interface LayoutCacheKey {
  /** 排序后的节点 ID 数组 */
  nodeIds: string[];
  /** deps 结构的 JSON 字符串 */
  depsSignature: string;
}

type CacheEntry = {
  result: TreeLayoutResult;
  timestamp: number;
};

const DEFAULT_TTL = 5 * 60 * 1000; // 5 分钟缓存过期时间

/**
 * 布局缓存管理器
 */
export class LayoutCache {
  private cache = new Map<string, CacheEntry>();
  private ttl: number;

  constructor(ttl: number = DEFAULT_TTL) {
    this.ttl = ttl;
  }

  /**
   * 生成缓存键的哈希值
   */
  private hashKey(key: LayoutCacheKey): string {
    const ids = key.nodeIds.join(',');
    return `${ids}|${key.depsSignature}`;
  }

  /**
   * 生成缓存键
   */
  static buildCacheKey(nodes: MapNodeDocument[]): LayoutCacheKey {
    // 排序节点 ID 确保顺序一致
    const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
    const nodeIds = sortedNodes.map(n => n.id);
    
    // 生成 deps 签名
    const depsSignature = sortedNodes
      .map(n => `${n.id}:${n.deps.sort().join('|')}`)
      .join(';');
    
    return { nodeIds, depsSignature };
  }

  /**
   * 获取缓存条目（带过期检查）
   */
  private getEntry(key: string): TreeLayoutResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // 检查过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.result;
  }

  /**
   * 设置缓存条目
   */
  private setEntry(key: string, result: TreeLayoutResult): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * 计算布局结果，如果缓存存在则直接返回
   */
  computeIfAbsent(
    nodes: MapNodeDocument[],
    options?: {
      activeNodeIds?: Set<string>;
      width?: number;
      height?: number;
    }
  ): TreeLayoutResult {
    const cacheKey = LayoutCache.buildCacheKey(nodes);
    const hash = this.hashKey(cacheKey);
    
    // 尝试从缓存获取
    const cached = this.getEntry(hash);
    if (cached) {
      // 缓存命中：仍需要根据 activeNodeIds 过滤可见节点
      return this.filterByActiveNodes(cached, options?.activeNodeIds);
    }
    
    // 缓存未命中：计算布局
    const result = layoutGraphTree(nodes, {
      activeNodeIds: options?.activeNodeIds,
      width: options?.width ?? VIEWBOX_WIDTH,
      height: options?.height ?? VIEWBOX_HEIGHT
    });
    
    // 存储完整布局到缓存
    this.setEntry(hash, result);
    
    return result;
  }

  /**
   * 根据 activeNodeIds 过滤缓存中的布局结果
   */
  private filterByActiveNodes(
    fullResult: TreeLayoutResult,
    activeNodeIds?: Set<string>
  ): TreeLayoutResult {
    if (!activeNodeIds) {
      return fullResult;
    }
    
    // 过滤实例
    const filteredInstances = fullResult.instances.filter(
      inst => activeNodeIds.has(inst.sourceNodeId)
    );
    
    // 过滤链接（两端节点都必须在可见节点中）
    const visibleInstanceKeys = new Set(filteredInstances.map(i => i.instanceKey));
    const filteredLinks = fullResult.links.filter(
      link => 
        visibleInstanceKeys.has(link.sourceInstanceKey) &&
        visibleInstanceKeys.has(link.targetInstanceKey)
    );
    
    return {
      instances: filteredInstances,
      links: filteredLinks
    };
  }

  /**
   * 使所有缓存失效
   */
  invalidate(): void {
    this.cache.clear();
  }

  /**
   * 使特定节点的缓存失效
   */
  invalidateNode(nodeId: string): void {
    // 简单策略：清除所有缓存
    // 精细策略：只清除涉及该节点的缓存（需要维护反向索引）
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }
}

// 全局单例缓存实例
let globalCache: LayoutCache | null = null;

/**
 * 获取全局布局缓存实例
 */
export function getLayoutCache(): LayoutCache {
  if (!globalCache) {
    globalCache = new LayoutCache();
  }
  return globalCache;
}

/**
 * 重置全局布局缓存
 */
export function resetLayoutCache(): void {
  if (globalCache) {
    globalCache.invalidate();
  }
  globalCache = null;
}

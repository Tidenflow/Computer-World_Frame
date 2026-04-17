/**
 * 统一布局协调器
 * 
 * 目标：将物理像素坐标与归一化世界坐标解耦
 * - 2D 渲染器：接收归一化坐标 × viewBox
 * - 3D 渲染器：接收归一化坐标 → 各布局变换
 * 
 * 这样可以确保 2D/3D original 布局完全对齐
 */

import type { MapNodeDocument } from '@shared/contract';
import type { GraphTreeInstance, TreeLayoutResult } from './cwframe.layout';
import { layoutGraphTree } from './cwframe.layout';

// ============================================================
// 视图配置
// ============================================================

export const VIEWBOX_WIDTH = 1200;
export const VIEWBOX_HEIGHT = 840;

export interface ViewConfig {
  width: number;
  height: number;
}

// ============================================================
// 归一化世界坐标
// ============================================================

export interface WorldCoord {
  /** 0-1 归一化 X */
  x: number;
  /** 0-1 归一化 Y */
  y: number;
  /** 树深度 */
  depth: number;
  /** 节点 ID */
  nodeId: string;
  /** 实例 Key */
  instanceKey: string;
  /** 父节点实例 Key */
  parentInstanceKey: string | null;
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// ============================================================
// 核心转换函数
// ============================================================

/**
 * 计算布局结果的边界框
 */
export function computeBounds(instances: GraphTreeInstance[]): WorldBounds {
  if (instances.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const inst of instances) {
    if (inst.x < minX) minX = inst.x;
    if (inst.x > maxX) maxX = inst.x;
    if (inst.y < minY) minY = inst.y;
    if (inst.y > maxY) maxY = inst.y;
  }

  return { minX, maxX, minY, maxY };
}

/**
 * 将树形布局实例转换为归一化世界坐标
 */
export function normalizeTreeInstances(instances: GraphTreeInstance[]): WorldCoord[] {
  const bounds = computeBounds(instances);
  const rangeX = bounds.maxX - bounds.minX || 1;
  const rangeY = bounds.maxY - bounds.minY || 1;

  return instances.map(inst => ({
    x: (inst.x - bounds.minX) / rangeX,
    y: (inst.y - bounds.minY) / rangeY,
    depth: inst.depth,
    nodeId: inst.sourceNodeId,
    instanceKey: inst.instanceKey,
    parentInstanceKey: inst.parentInstanceKey
  }));
}

/**
 * 归一化坐标转 2D 物理像素坐标
 */
export function worldToPixel2D(
  worldCoord: WorldCoord,
  viewConfig: ViewConfig
): { x: number; y: number } {
  return {
    x: worldCoord.x * viewConfig.width,
    y: worldCoord.y * viewConfig.height
  };
}

/**
 * 批量将归一化坐标转 2D 物理像素坐标
 */
export function worldToPixel2DBatch(
  worldCoords: WorldCoord[],
  viewConfig: ViewConfig
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();
  for (const wc of worldCoords) {
    result.set(wc.instanceKey, {
      x: wc.x * viewConfig.width,
      y: wc.y * viewConfig.height
    });
  }
  return result;
}

// ============================================================
// 统一布局引擎
// ============================================================

export interface UnifiedLayoutInput {
  nodes: MapNodeDocument[];
  activeNodeIds?: Set<string>;
}

export interface UnifiedLayoutOutput {
  /** 原始树形布局实例（物理像素） */
  treeInstances: GraphTreeInstance[];
  /** 归一化世界坐标 */
  worldCoords: WorldCoord[];
  /** 边界框 */
  bounds: WorldBounds;
  /** 链接数据 */
  links: Array<{
    sourceInstanceKey: string;
    targetInstanceKey: string;
    sourceNodeId: string;
    targetNodeId: string;
    key: string;
  }>;
}

/**
 * 统一布局引擎入口
 * 同时输出物理像素坐标和归一化世界坐标
 */
export function computeUnifiedLayout(input: UnifiedLayoutInput): UnifiedLayoutOutput {
  const { nodes, activeNodeIds } = input;

  if (nodes.length === 0) {
    return {
      treeInstances: [],
      worldCoords: [],
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
      links: []
    };
  }

  // 计算树形布局（使用物理像素）
  const treeResult = layoutGraphTree(nodes, {
    activeNodeIds: activeNodeIds ?? undefined,
    width: VIEWBOX_WIDTH,
    height: VIEWBOX_HEIGHT
  });

  // 转换为归一化坐标
  const worldCoords = normalizeTreeInstances(treeResult.instances);

  // 计算边界框
  const bounds = computeBounds(treeResult.instances);

  return {
    treeInstances: treeResult.instances,
    worldCoords,
    bounds,
    links: treeResult.links.map(l => ({
      sourceInstanceKey: l.sourceInstanceKey,
      targetInstanceKey: l.targetInstanceKey,
      sourceNodeId: l.sourceNodeId,
      targetNodeId: l.targetNodeId,
      key: l.key
    }))
  };
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 根据节点 ID 查找归一化坐标
 */
export function findWorldCoordByNodeId(
  worldCoords: WorldCoord[],
  nodeId: string
): WorldCoord | undefined {
  return worldCoords.find(wc => wc.nodeId === nodeId);
}

/**
 * 根据实例 Key 查找归一化坐标
 */
export function findWorldCoordByInstanceKey(
  worldCoords: WorldCoord[],
  instanceKey: string
): WorldCoord | undefined {
  return worldCoords.find(wc => wc.instanceKey === instanceKey);
}

/**
 * 获取 3D 归一化坐标（用于布局变换输入）
 * 注意：3D sphere/galaxy 变换内部会做进一步归一化
 */
export function getNormalizedFor3D(worldCoords: WorldCoord[]): WorldCoord[] {
  return worldCoords;
}

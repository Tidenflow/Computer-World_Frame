/**
 * 3D 布局算法
 * 将 2D 树形布局映射到 3D 空间，并支持多种布局变换
 * 
 * 架构：
 * - 使用 layout-coordinator.ts 提供的统一布局引擎
 * - 接收归一化世界坐标，确保 2D/3D original 布局完全对齐
 */

import type { MapNodeDocument } from '@shared/contract';
import type { Graph3DNode, GraphLayoutType, Point3D } from '../types/domain-filter';
import {
  computeUnifiedLayout,
  type WorldCoord,
  type WorldBounds
} from './layout-coordinator';

/** 变换配置 */
interface TransformConfig {
  domainIndex: number;
  totalDomains: number;
  nodeIndex: number;
  totalNodes: number;
}

/**
 * 计算所有节点的 3D 位置
 */
export function compute3DPositions(
  nodes: MapNodeDocument[],
  visibilityMap: Record<string, 'Dimmed' | 'Unlocked'>,
  layoutType: GraphLayoutType = 'original'
): Graph3DNode[] {
  if (nodes.length === 0) return [];

  // 获取所有 domain 用于布局分配
  const domains = [...new Set(nodes.map(n => n.domain || 'default'))];
  const domainIndexMap = new Map(domains.map((d, i) => [d, i]));

  // 使用统一布局引擎获取归一化坐标
  const unified = computeUnifiedLayout({
    nodes,
    activeNodeIds: new Set(nodes.map(n => n.id))
  });

  // 生成 Graph3DNode 数组
  const graphNodes: Graph3DNode[] = unified.worldCoords.map((worldCoord, idx) => {
    const node = nodes.find(n => n.id === worldCoord.nodeId)!;
    // original 模式下直接使用归一化坐标（乘以固定系数映射到 3D 空间）
    const scale = 100; // 归一化 0-1 映射到 3D 空间的缩放系数
    return {
      id: node.id,
      title: node.title,
      domain: node.domain || 'default',
      stage: node.stage,
      x: worldCoord.x * scale,
      y: worldCoord.y * scale,
      z: 0, // original 模式 z=0
      visibility: visibilityMap[node.id] ?? 'Dimmed'
    };
  });

  // 应用布局变换
  if (layoutType !== 'original') {
    return applyLayoutTransform(graphNodes, layoutType, domains, domainIndexMap, unified.bounds);
  }

  return graphNodes;
}

/**
 * 应用布局变换
 */
function applyLayoutTransform(
  nodes: Graph3DNode[],
  layoutType: GraphLayoutType,
  domains: string[],
  domainIndexMap: Map<string, number>,
  bounds: WorldBounds
): Graph3DNode[] {
  const totalDomains = domains.length;

  return nodes.map((node, idx) => {
    const domainIndex = domainIndexMap.get(node.domain) ?? domains.indexOf('default');
    const config: TransformConfig = {
      domainIndex,
      totalDomains,
      nodeIndex: idx,
      totalNodes: nodes.length
    };

    let transformed: Point3D;

    switch (layoutType) {
      case 'sphere':
        transformed = sphereTransform(node, config, bounds);
        break;
      case 'galaxy':
        transformed = galaxyTransform(node, config, bounds);
        break;
      default:
        transformed = { x: node.x, y: node.y, z: node.z };
    }

    return { ...node, ...transformed };
  });
}

/**
 * 球面布局：将节点分布到球面上
 * 
 * 输入的 x, y 已经是归一化坐标 (0-1)，变换后映射到球面
 */
function sphereTransform(
  node: Graph3DNode,
  config: TransformConfig,
  bounds: WorldBounds
): Point3D {
  // node.x, node.y 在 original 模式下已经是 0-100 范围的缩放值
  // 需要重新归一化到 0-1
  const u = node.x / 100;
  const v = node.y / 100;

  // 使用 Fibonacci 球面分布分配扇区
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const clusterTheta = config.domainIndex * goldenAngle * 0.5;
  const clusterPhi = Math.acos(1 - (2 * (config.domainIndex + 0.5)) / config.totalDomains);

  const sectorSize = Math.PI / Math.sqrt(config.totalDomains);
  const theta = clusterTheta + (u - 0.5) * sectorSize;
  const phi = clusterPhi + (v - 0.5) * sectorSize * 0.5;

  // 基础半径，根据 stage 调整
  const radius = 80 + node.stage * 8;

  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta),
    z: radius * Math.cos(phi)
  };
}

/**
 * 星系布局：创建螺旋星系形状
 * 
 * 输入的 x, y 已经是归一化坐标 (0-1)，变换后映射到螺旋星系
 */
function galaxyTransform(
  node: Graph3DNode,
  config: TransformConfig,
  bounds: WorldBounds
): Point3D {
  // node.x, node.y 在 original 模式下已经是 0-100 范围的缩放值
  // 需要重新归一化到 0-1
  const normalizedX = node.x / 100;
  const normalizedY = node.y / 100;

  // 螺旋臂数量
  const armCount = Math.min(6, Math.max(3, config.totalDomains));
  const armIndex = config.domainIndex % armCount;

  // 基础角度
  const baseAngle = (armIndex / armCount) * 2 * Math.PI;

  // 距离中心的位置
  const distanceFromCenter = 15 + normalizedX * 65 + config.nodeIndex * 0.03;

  // 螺旋紧密度
  const spiralTightness = 0.12;
  const spiralAngle = baseAngle + distanceFromCenter * spiralTightness;

  // 局部偏移
  const offsetAngle = (normalizedY - 0.5) * 0.25;
  const offsetRadius = (normalizedY - 0.5) * 8;

  const finalAngle = spiralAngle + offsetAngle;
  const finalRadius = distanceFromCenter + offsetRadius;

  // 高度变化
  const height = (node.stage - 1) * 4 + (normalizedY - 0.5) * 3;

  return {
    x: finalRadius * Math.cos(finalAngle),
    y: finalRadius * Math.sin(finalAngle),
    z: height
  };
}

/**
 * 获取布局类型的默认相机位置
 */
export function getDefaultCamera(layoutType: GraphLayoutType) {
  switch (layoutType) {
    case 'sphere':
      return { eye: { x: 1.8, y: 1.8, z: 1.2 }, center: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 0, z: 1 } };
    case 'galaxy':
      return { eye: { x: 0.2, y: 0.2, z: 2.2 }, center: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 1, z: 0 } };
    case 'original':
    default:
      return { eye: { x: 0.5, y: 0.5, z: 0.6 }, center: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 0, z: 1 } };
  }
}

/**
 * 按 domain 分组节点
 */
export function groupByDomain(nodes: Graph3DNode[]): Map<string, Graph3DNode[]> {
  const groups = new Map<string, Graph3DNode[]>();

  for (const node of nodes) {
    const domain = node.domain || 'default';
    if (!groups.has(domain)) {
      groups.set(domain, []);
    }
    groups.get(domain)!.push(node);
  }

  return groups;
}

/**
 * 获取特定 domain 的中心点
 */
export function getDomainCentroid(nodes: Graph3DNode[]): Point3D | null {
  if (nodes.length === 0) return null;

  const sum = nodes.reduce(
    (acc, n) => ({ x: acc.x + n.x, y: acc.y + n.y, z: acc.z + n.z }),
    { x: 0, y: 0, z: 0 }
  );

  return {
    x: sum.x / nodes.length,
    y: sum.y / nodes.length,
    z: sum.z / nodes.length
  };
}

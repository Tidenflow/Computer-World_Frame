/**
 * 3D 布局算法
 * 将 2D 树形布局映射到 3D 空间，并支持多种布局变换
 */

import type { MapNodeDocument } from '@shared/contract';
import type { Graph3DNode, GraphLayoutType, Point3D } from '../types/domain-filter';
import { layoutGraphTree } from './cwframe.layout';

const VIEWBOX_WIDTH = 1200;
const VIEWBOX_HEIGHT = 840;

/** 边界框 */
interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

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

  // 计算 2D 树形布局
  const treeLayout = layoutGraphTree(nodes, {
    activeNodeIds: new Set(nodes.map(n => n.id)),
    width: VIEWBOX_WIDTH,
    height: VIEWBOX_HEIGHT
  });

  // 创建节点实例映射
  const instanceMap = new Map<string, typeof treeLayout.instances[0] & { instanceKey: string }>();
  for (const instance of treeLayout.instances) {
    instanceMap.set((instance as any).instanceKey, instance);
  }

  // 计算边界
  const bounds: Bounds = {
    minX: Math.min(...treeLayout.instances.map(i => (i as any).x)),
    maxX: Math.max(...treeLayout.instances.map(i => (i as any).x)),
    minY: Math.min(...treeLayout.instances.map(i => (i as any).y)),
    maxY: Math.max(...treeLayout.instances.map(i => (i as any).y))
  };

  // 生成 Graph3DNode 数组
  const graphNodes: Graph3DNode[] = treeLayout.instances.map((instance, idx) => {
    const node = nodes.find(n => n.id === (instance as any).sourceNodeId)!;
    const point: Point3D = { x: (instance as any).x, y: (instance as any).y, z: 0 };

    return {
      id: node.id,
      title: node.title,
      domain: node.domain || 'default',
      stage: node.stage,
      x: point.x,
      y: point.y,
      z: point.z,
      visibility: visibilityMap[node.id] ?? 'Dimmed'
    };
  });

  // 应用布局变换
  if (layoutType !== 'original') {
    return applyLayoutTransform(graphNodes, layoutType, domains, domainIndexMap, bounds);
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
  bounds: Bounds
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
      case 'wave':
        transformed = waveTransform(node, config);
        break;
      case 'helix':
        transformed = helixTransform(node, config, bounds);
        break;
      case 'torus':
        transformed = torusTransform(node, config, bounds);
        break;
      default:
        transformed = { x: node.x, y: node.y, z: node.z };
    }

    return { ...node, ...transformed };
  });
}

/**
 * 球面布局：将节点分布到球面上
 */
function sphereTransform(
  node: Graph3DNode,
  config: TransformConfig,
  bounds: Bounds
): Point3D {
  // 归一化坐标到 0-1
  const u = (node.x - bounds.minX) / (bounds.maxX - bounds.minX || 1);
  const v = (node.y - bounds.minY) / (bounds.maxY - bounds.minY || 1);

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
 */
function galaxyTransform(
  node: Graph3DNode,
  config: TransformConfig,
  bounds: Bounds
): Point3D {
  const normalizedX = (node.x - bounds.minX) / (bounds.maxX - bounds.minX || 1);
  const normalizedY = (node.y - bounds.minY) / (bounds.maxY - bounds.minY || 1);

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
 * 波浪布局：创建起伏的地形效果
 */
function waveTransform(
  node: Graph3DNode,
  config: TransformConfig
): Point3D {
  const x = node.x / 20;
  const y = node.y / 20;

  // 波浪参数
  const frequency = 0.15;
  const amplitude = 15;

  // 多个波叠加
  const wave1 = Math.sin(x * frequency) * amplitude;
  const wave2 = Math.cos(y * frequency) * amplitude;
  const wave3 = Math.sin((x + y) * frequency * 0.7) * amplitude * 0.4;

  // 按 domain 分层偏移
  const domainOffset = (config.domainIndex / config.totalDomains) * 25 - 12;

  const finalZ = wave1 + wave2 + wave3 + domainOffset;

  return {
    x: node.x - 600,
    y: node.y - 420,
    z: finalZ
  };
}

/**
 * 螺旋布局：DNA 双螺旋形状
 */
function helixTransform(
  node: Graph3DNode,
  config: TransformConfig,
  bounds: Bounds
): Point3D {
  const normalizedX = (node.x - bounds.minX) / (bounds.maxX - bounds.minX || 1);

  // 进度计算
  const domainProgress = config.domainIndex / config.totalDomains;
  const nodeProgress = config.nodeIndex / config.totalNodes;
  const totalProgress = domainProgress + nodeProgress / config.totalDomains;

  // 螺旋参数
  const turns = 3;
  const angle = totalProgress * turns * 2 * Math.PI;
  const height = totalProgress * 200 - 100;

  // 半径
  const radiusBase = 35;
  const radiusVariation = normalizedX * 12;
  const radius = radiusBase + radiusVariation;

  // 摆动
  const wobble = Math.sin(angle * 2) * normalizedX * 4;

  return {
    x: (radius + wobble) * Math.cos(angle),
    y: (radius + wobble) * Math.sin(angle),
    z: height + node.stage * 2
  };
}

/**
 * 圆环布局：甜甜圈形状
 */
function torusTransform(
  node: Graph3DNode,
  config: TransformConfig,
  bounds: Bounds
): Point3D {
  const u = (node.x - bounds.minX) / (bounds.maxX - bounds.minX || 1);
  const v = (node.y - bounds.minY) / (bounds.maxY - bounds.minY || 1);

  // 圆环参数
  const majorRadius = 50;
  const minorRadius = 22;

  // 角度计算
  const clusterAngleOffset = (config.domainIndex / config.totalDomains) * 2 * Math.PI;
  const majorSectorSize = (2 * Math.PI) / Math.max(config.totalDomains, 1);
  const theta = clusterAngleOffset + (u - 0.5) * majorSectorSize;

  const phi = v * 2 * Math.PI;

  return {
    x: (majorRadius + minorRadius * Math.cos(phi)) * Math.cos(theta),
    y: (majorRadius + minorRadius * Math.cos(phi)) * Math.sin(theta),
    z: minorRadius * Math.sin(phi) + node.stage * 3
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
    case 'wave':
      return { eye: { x: 1.8, y: 0.8, z: 0.8 }, center: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 0, z: 1 } };
    case 'helix':
      return { eye: { x: 1.2, y: 1.2, z: 0.8 }, center: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 0, z: 1 } };
    case 'torus':
      return { eye: { x: 1.5, y: 1.5, z: 1 }, center: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 0, z: 1 } };
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

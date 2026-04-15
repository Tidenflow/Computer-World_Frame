import type { CWFrameMapPayload, UserProgressDocument } from '@shared/contract';

export type CWFrameNodeVisibility = 'Hidden' | 'Dimmed' | 'Outlined' | 'Unlocked';

/**
 * Dimmed: 初始状态，节点以灰白色显示，用户尚未解锁
 * Outlined: 解锁节点的邻居，显示为虚线描边
 * Unlocked: 已解锁的节点，按 domain 着色
 * Hidden: 完全隐藏（可用于未来功能）
 */

function buildAdjacencyMap(map: CWFrameMapPayload): Record<string, Set<string>> {
  const adjacencyMap: Record<string, Set<string>> = {};

  for (const node of map.document.nodes) {
    if (!adjacencyMap[node.id]) adjacencyMap[node.id] = new Set<string>();

    for (const depId of node.deps) {
      adjacencyMap[node.id].add(depId);
      if (!adjacencyMap[depId]) adjacencyMap[depId] = new Set<string>();
      adjacencyMap[depId].add(node.id);
    }
  }

  return adjacencyMap;
}

export function buildVisibilityMap(
  map: CWFrameMapPayload,
  progress: UserProgressDocument
): Record<string, CWFrameNodeVisibility> {
  // 初始状态：所有节点都是 Dimmed（灰白色）
  const visibilityMap = Object.fromEntries(
    map.document.nodes.map(node => [node.id, 'Dimmed' as CWFrameNodeVisibility])
  );

  const unlockedIds = new Set(Object.keys(progress.unlocked));

  // 已解锁的节点
  for (const nodeId of unlockedIds) {
    visibilityMap[nodeId] = 'Unlocked';
  }

  // 已解锁节点的邻居显示为 Outlined
  const adjacencyMap = buildAdjacencyMap(map);
  for (const unlockedId of unlockedIds) {
    const neighbors = adjacencyMap[unlockedId];
    if (!neighbors) continue;

    for (const neighborId of neighbors) {
      if (!unlockedIds.has(neighborId)) {
        visibilityMap[neighborId] = 'Outlined';
      }
    }
  }

  return visibilityMap;
}

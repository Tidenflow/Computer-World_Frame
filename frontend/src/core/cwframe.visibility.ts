import type { CWFrameMap, CWFrameProgress } from '@shared/contract';

export type CWFrameNodeVisibility = 'Hidden' | 'Outlined' | 'Unlocked';

function buildAdjacencyMap(map: CWFrameMap): Record<number, Set<number>> {
  const adjacencyMap: Record<number, Set<number>> = {};

  for (const node of map.nodes) {
    if (!adjacencyMap[node.id]) adjacencyMap[node.id] = new Set<number>();

    for (const depId of node.dependencies) {
      adjacencyMap[node.id].add(depId);
      if (!adjacencyMap[depId]) adjacencyMap[depId] = new Set<number>();
      adjacencyMap[depId].add(node.id);
    }
  }

  return adjacencyMap;
}

export function buildVisibilityMap(
  map: CWFrameMap,
  progress: CWFrameProgress
): Record<number, CWFrameNodeVisibility> {
  const visibilityMap = Object.fromEntries(
    map.nodes.map(node => [node.id, 'Hidden' as CWFrameNodeVisibility])
  );

  const unlockedIds = new Set(
    Object.keys(progress.unlockedNodes).map(id => Number(id))
  );

  for (const nodeId of unlockedIds) {
    visibilityMap[nodeId] = 'Unlocked';
  }

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

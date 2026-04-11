import type { CWFrameMapPayload } from '@shared/contract';
import type { UserProgressDocument } from '@shared/map-document';

export type CWFrameNodeVisibility = 'Hidden' | 'Outlined' | 'Unlocked';

function buildAdjacencyMap(map: CWFrameMapPayload): Record<string, Set<string>> {
  const adjacencyMap: Record<string, Set<string>> = {};

  for (const nodeId of map.projection.topologicalOrder) {
    adjacencyMap[nodeId] ??= new Set<string>();
    const node = map.projection.nodeById[nodeId];

    for (const depId of node.deps) {
      adjacencyMap[nodeId].add(depId);
      adjacencyMap[depId] ??= new Set<string>();
      adjacencyMap[depId].add(nodeId);
    }
  }

  return adjacencyMap;
}

export function buildVisibilityMap(
  map: CWFrameMapPayload,
  progress: UserProgressDocument
): Record<string, CWFrameNodeVisibility> {
  const visibilityMap = Object.fromEntries(
    map.projection.topologicalOrder.map(nodeId => [nodeId, 'Hidden' as CWFrameNodeVisibility])
  );

  const unlockedIds = new Set(Object.keys(progress.unlocked));
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

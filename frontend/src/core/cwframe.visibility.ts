import type { CWFrameMapPayload, UserProgressDocument } from '@shared/contract';

export type CWFrameNodeVisibility = 'Hidden' | 'Outlined' | 'Unlocked';

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
  const visibilityMap = Object.fromEntries(
    map.document.nodes.map(node => [node.id, 'Hidden' as CWFrameNodeVisibility])
  );

  const unlockedIds = new Set(Object.keys(progress.unlocked));

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

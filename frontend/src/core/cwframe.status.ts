import type { CWFrameMapPayload } from '@shared/contract';
import type { MapNodeDocument, UserProgressDocument } from '@shared/map-document';

export type CWFrameNodeStatus = 'Locked' | 'Discoverable' | 'Unlocked';

function getNodeStatus(
  node: MapNodeDocument,
  progress: UserProgressDocument
): CWFrameNodeStatus {
  if (progress.unlocked[node.id]) return 'Unlocked';

  const allDependenciesUnlocked = node.deps.every((depId) => depId in progress.unlocked);
  return allDependenciesUnlocked ? 'Discoverable' : 'Locked';
}

function buildStatusMap(
  map: CWFrameMapPayload,
  progress: UserProgressDocument
): Record<string, CWFrameNodeStatus> {
  return Object.fromEntries(
    map.projection.topologicalOrder.map((nodeId) => {
      const node = map.projection.nodeById[nodeId];
      return [nodeId, getNodeStatus(node, progress)];
    })
  );
}

export { getNodeStatus, buildStatusMap };

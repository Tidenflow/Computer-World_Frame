import type { CWFrameNode, CWFrameMap, CWFrameProgress } from "@shared/contract";

export type CWFrameNodeStatus = 'Locked' | 'Discoverable' | 'Unlocked';

function getNodeStatus(node: CWFrameNode, progress: CWFrameProgress): CWFrameNodeStatus {
    if (node.id in progress.unlockedNodes) return 'Unlocked';

    const allDependenciesUnlocked = node.dependencies.every(depId => depId in progress.unlockedNodes);
    return allDependenciesUnlocked ? 'Discoverable' : 'Locked';
}

function buildStatusMap(map: CWFrameMap, progress: CWFrameProgress): Record<number, CWFrameNodeStatus> {
    return Object.fromEntries(map.nodes.map(node => [node.id, getNodeStatus(node, progress)]));
}

export { getNodeStatus, buildStatusMap };

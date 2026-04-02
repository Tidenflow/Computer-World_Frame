import type { CWFrameNode, CWFrameMap, CWFrameProgress } from "@shared/contract";

export type CWFrameNodeStatus = 'Locked' | 'Discoverable' | 'Unlocked';

/**
 * 计算单个节点的状态（Locked/Discoverable/Unlocked）。
 *
 * 判定规则：
 * - 若该节点已在 `progress.unlockedNodes` 中存在记录，则为 `Unlocked`
 * - 否则若其所有依赖节点都已解锁，则为 `Discoverable`
 * - 否则为 `Locked`
 *
 * @param node - 目标节点
 * @param progress - 当前用户的解锁进度
 * @returns 节点状态
 */
function getNodeStatus(node: CWFrameNode, progress: CWFrameProgress): CWFrameNodeStatus {
    if (node.id in progress.unlockedNodes) return 'Unlocked';

    const allDependenciesUnlocked = node.dependencies.every(depId => depId in progress.unlockedNodes);
    return allDependenciesUnlocked ? 'Discoverable' : 'Locked';
}

/**
 * 根据整张地图与用户进度生成 `statusMap`。
 *
 * @param map - 知识图谱（包含全部节点）
 * @param progress - 用户进度（包含已解锁节点表）
 * @returns 一个以 `nodeId` 为 key 的状态映射表：`Record<number, CWFrameNodeStatus>`
 */
function buildStatusMap(map: CWFrameMap, progress: CWFrameProgress): Record<number, CWFrameNodeStatus> {
    return Object.fromEntries(map.nodes.map(node => [node.id, getNodeStatus(node, progress)]));
}

export { getNodeStatus, buildStatusMap };

import type { MapNodeDocument, CWFrameMapPayload, UserProgressDocument } from "@shared/contract";

export type CWFrameNodeStatus = 'Locked' | 'Discoverable' | 'Unlocked';

/**
 * 计算单个节点的状态（Locked/Discoverable/Unlocked）。
 *
 * 判定规则：
 * - 若该节点已在 `progress.unlocked` 中存在记录，则为 `Unlocked`
 * - 否则若其所有依赖节点都已解锁，则为 `Discoverable`
 * - 否则为 `Locked`
 *
 * @param node - 目标节点
 * @param progress - 当前用户的解锁进度
 * @returns 节点状态
 */
function getNodeStatus(node: MapNodeDocument, progress: UserProgressDocument): CWFrameNodeStatus {
    if (node.id in progress.unlocked) return 'Unlocked';

    const allDependenciesUnlocked = node.deps.every(depId => depId in progress.unlocked);
    return allDependenciesUnlocked ? 'Discoverable' : 'Locked';
}

/**
 * 根据整张地图与用户进度生成 `statusMap`。
 *
 * @param map - 知识图谱（包含全部节点）
 * @param progress - 用户进度（包含已解锁节点表）
 * @returns 一个以 `nodeId` 为 key 的状态映射表：`Record<string, CWFrameNodeStatus>`
 */
function buildStatusMap(map: CWFrameMapPayload, progress: UserProgressDocument): Record<string, CWFrameNodeStatus> {
    return Object.fromEntries(map.document.nodes.map(node => [node.id, getNodeStatus(node, progress)]));
}

export { getNodeStatus, buildStatusMap };

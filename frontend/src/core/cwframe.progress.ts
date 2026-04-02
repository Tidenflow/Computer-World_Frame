import type { CWFrameProgress, CWFrameNode } from "@shared/contract";

/**
 * 解锁单个节点（开放式探索：不检查依赖是否已解锁）。
 *
 * @param progress - 当前用户进度对象（会被原地修改）
 * @param node - 要解锁的目标节点
 * @returns void
 *
 * @sideEffects 会直接写入 `progress.unlockedNodes[node.id]`
 */
export function unlockNode(progress: CWFrameProgress, node: CWFrameNode): void {
    if (progress.unlockedNodes[node.id]) return;
    progress.unlockedNodes[node.id] = { unlockedAt: Date.now() };
}

/**
 * 锁定（移除）单个节点的解锁记录。
 *
 * @param progress - 当前用户进度对象（会被原地修改）
 * @param node - 要移除解锁记录的节点
 * @returns void
 *
 * @sideEffects 会删除 `progress.unlockedNodes[node.id]`
 */
export function lockNode(progress: CWFrameProgress, node: CWFrameNode): void {
    delete progress.unlockedNodes[node.id];
}

/**
 * 清空进度（移除全部解锁记录）。
 *
 * @param progress - 当前用户进度对象（会被原地修改）
 * @returns void
 *
 * @sideEffects 会重置 `progress.unlockedNodes = {}`
 */
export function resetProgress(progress: CWFrameProgress): void {
    progress.unlockedNodes = {};
}

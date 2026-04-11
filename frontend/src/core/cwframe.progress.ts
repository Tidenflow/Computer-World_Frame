import type { UserProgressDocument, MapNodeDocument } from "@shared/contract";

/**
 * 解锁单个节点（开放式探索：不检查依赖是否已解锁）。
 *
 * @param progress - 当前用户进度对象（会被原地修改）
 * @param node - 要解锁的目标节点
 * @returns void
 *
 * @sideEffects 会直接写入 `progress.unlocked[node.id]`
 */
export function unlockNode(progress: UserProgressDocument, node: MapNodeDocument): void {
    if (progress.unlocked[node.id]) return;
    progress.unlocked[node.id] = { unlockedAt: Date.now() };
}

import type { CWFrameProgress, CWFrameNode } from "@shared/contract";

// 开放式探索：用户输入匹配即解锁，不检查依赖
export function unlockNode(progress: CWFrameProgress, node: CWFrameNode): void {
    if (progress.unlockedNodes[node.id]) return;
    progress.unlockedNodes[node.id] = { unlockedAt: Date.now() };
}

// 移除单个节点（用于观察去掉某节点后的框架形态）
export function lockNode(progress: CWFrameProgress, node: CWFrameNode): void {
    delete progress.unlockedNodes[node.id];
}

export function resetProgress(progress: CWFrameProgress): void {
    progress.unlockedNodes = {};
}

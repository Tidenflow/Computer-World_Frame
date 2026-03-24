//  core/cwframe.progress.ts
//  关于CWFrameProgress的操作逻辑

import type { CWFrameProgress, CWFrameNode } from "@shared/contract";

// 解锁节点函数 — 开放式探索，用户输入匹配即解锁，不检查依赖
export function unlockNode(progress: CWFrameProgress, node: CWFrameNode): boolean {
    // 避免重复解锁
    if (progress.unlockedNodes[node.id]) return true;

    progress.unlockedNodes[node.id] = { unlockedAt: Date.now() };
    return true;
}

// 移除节点函数 — 简单移除，用户想看看去掉这个节点的框架是怎样的
export function lockNode(progress: CWFrameProgress, node: CWFrameNode): void {
    delete progress.unlockedNodes[node.id];
}

// 重置进程状态
export function resetProgress(progress: CWFrameProgress): void {
    progress.unlockedNodes = {};
}
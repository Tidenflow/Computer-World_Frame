import type { CWFrameMapPayload, UserProgressDocument } from '@shared/contract';

export type CWFrameNodeVisibility = 'Dimmed' | 'Unlocked';

/**
 * Dimmed: 未解锁的节点，以灰白色显示
 * Unlocked: 已解锁的节点，按 domain 着色
 */

/**
 * 构建节点可见性映射。
 * 逻辑：已解锁 → 彩色；其余全部 → 默认灰色（无中间状态）
 */
export function buildVisibilityMap(
  map: CWFrameMapPayload,
  progress: UserProgressDocument
): Record<string, CWFrameNodeVisibility> {
  const visibilityMap: Record<string, CWFrameNodeVisibility> = {};

  // 初始：全部 Dimmed
  for (const node of map.document.nodes) {
    visibilityMap[node.id] = 'Dimmed';
  }

  // 已解锁 → Unlocked
  const unlockedIds = new Set(Object.keys(progress.unlocked));
  for (const nodeId of unlockedIds) {
    visibilityMap[nodeId] = 'Unlocked';
  }

  return visibilityMap;
}

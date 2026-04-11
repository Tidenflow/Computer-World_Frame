import type { MapNodeDocument } from '@shared/contract';

/**
 * 将用户输入的术语与知识节点进行匹配（轻量、无模型版）。
 *
 * 匹配顺序（从强到弱）：
 * - 精确匹配：`node.title === term`
 * - 别名匹配：`node.aliases` 中存在与 term 精确相等的别名（可选字段）
 * - 部分匹配：title 包含 term 或 term 包含 title
 *
 * @param term - 用户输入的单个术语（会被 trim + toLowerCase 归一化）
 * @param nodes - 候选节点列表（通常来自 `CWFrameMapPayload.document.nodes`）
 * @returns 命中的节点；若未命中返回 null
 */
export function matchNodeByTerm(term: string, nodes: MapNodeDocument[]): MapNodeDocument | null {
  const normalizedTerm = term.toLowerCase().trim();
  if (!normalizedTerm) return null;

  // 1. 精确匹配节点名称 (title)
  let matched = nodes.find(node =>
    node.title.toLowerCase() === normalizedTerm
  );
  if (matched) return matched;

  // 2. 别名匹配
  matched = nodes.find(node =>
    node.aliases?.some((alias: string) => alias.toLowerCase() === normalizedTerm)
  );
  if (matched) return matched;

  // 3. 部分匹配节点名称
  matched = nodes.find(node =>
    node.title.toLowerCase().includes(normalizedTerm) ||
    normalizedTerm.includes(node.title.toLowerCase())
  );
  if (matched) return matched;

  return null;
}

/**
 * 将输入字符串切分成多个术语。
 *
 * 支持分隔符：英文逗号、中文逗号、顿号、以及任意空白符。
 *
 * @param input - 原始输入（例如："CPU, 内存 操作系统"）
 * @returns 术语数组（已 trim，且会过滤空字符串）
 */
export function extractTerms(input: string): string[] {
  return input
    .split(/[,，、\s]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

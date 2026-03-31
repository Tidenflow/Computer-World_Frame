import type { CWFrameNode } from '@shared/contract';

/**
 * 模糊匹配算法：将用户输入与节点进行匹配
 * 支持：精确匹配、别名匹配（如果数据中有就匹配）、部分匹配
 */
export function matchNodeByTerm(term: string, nodes: CWFrameNode[]): CWFrameNode | null {
  const normalizedTerm = term.toLowerCase().trim();
  if (!normalizedTerm) return null;

  // 1. 精确匹配节点名称 (label)
  let matched = nodes.find(node => 
    node.label.toLowerCase() === normalizedTerm
  );
  if (matched) return matched;

  // 2. 别名匹配 (如果数据中有就匹配)
  matched = nodes.find(node =>
    // @ts-ignore - 预留别名匹配逻辑
    (node as any).aliases?.some((alias: string) => alias.toLowerCase() === normalizedTerm)
  );
  if (matched) return matched;

  // 3. 部分匹配节点名称
  matched = nodes.find(node =>
    node.label.toLowerCase().includes(normalizedTerm) ||
    normalizedTerm.includes(node.label.toLowerCase())
  );
  if (matched) return matched;

  return null;
}

/**
 * 提取输入中的多个术语（以逗号、空格等分隔）
 */
export function extractTerms(input: string): string[] {
  return input
    .split(/[,，、\s]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

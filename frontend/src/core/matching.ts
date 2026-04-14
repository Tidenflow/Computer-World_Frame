import type { MapNodeDocument } from '@shared/contract';
import { vectorCache } from './vector-cache';

/**
 * ========================================================================
 * 语义匹配模块 — Phase 1（纯规则版）
 *
 * 匹配策略（按优先级降序）：
 * 1. 精确匹配 node.title
 * 2. 别名匹配 node.aliases
 * 3. 部分匹配（node.title 包含 term 或反之）
 * 4. 动态兜底（基于字符串相似度的模糊匹配）
 *
 * 新增能力：返回多候选 + 上下文提示，支持 UI 层展示选择列表
 * ========================================================================
 */

/**
 * 匹配类型：标识候选节点是如何被命中的
 */
export type MatchType = 'exact' | 'alias' | 'partial' | 'fuzzy' | 'semantic' | 'suggestion' | 'non-tech';

/**
 * 单个匹配候选
 *
 * node: 命中的节点（非技术话题时为 null）
 * matchType: 匹配类型（决定展示样式）
 * contextHints: 上下文提示数组（领域 / 依赖 / 学习阶段等）
 * score: 匹配分数（0.0 ~ 1.0，用于排序）
 */
export interface MatchCandidate {
  node: MapNodeDocument | null;
  matchType: MatchType;
  contextHints: string[];
  score: number;
}

/**
 * 匹配结果
 *
 * candidates: 候选列表（按 score 降序排列）
 * autoSelect: 是否应该自动选中（仅在候选数 = 1 时为 true，其余情况需用户选择）
 */
export interface MatchResult {
  candidates: MatchCandidate[];
  autoSelect: boolean;
}

/**
 * 主匹配入口
 *
 * 策略流程：
 *   1. 关键词精确匹配 → 返回多候选（按 score 降序）
 *   2. 若无匹配 → 动态兜底（字符串相似度 + 意图黑名单）
 *   3. 结果数 = 1  → autoSelect = true
 *   4. 结果数 = 0  → 返回友好提示
 *
 * @param term - 用户输入的单个术语（会被 trim + toLowerCase 归一化）
 * @param nodes - 候选节点列表（通常来自 map.document.nodes）
 * @returns MatchResult 对象
 */
export function matchNodeByTerm(
  term: string,
  nodes: MapNodeDocument[]
): MatchResult {
  const normalizedTerm = term.toLowerCase().trim();
  if (!normalizedTerm) {
    return { candidates: [], autoSelect: false };
  }

  // 阶段 0：意图分析（优先于关键词匹配）
  // 宁可漏判（放过部分"碰巧技术"的内容），也不把明显的非技术词兜底成技术节点
  if (isLikelyNonTech(normalizedTerm)) {
    return {
      candidates: [{
        node: null,
        matchType: 'non-tech',
        contextHints: [
          `未找到 "${term}" 相关节点`,
          `请输入技术术语，如 "API"、"CPU"、"HTTP" 等`
        ],
        score: 0
      }],
      autoSelect: false
    };
  }

  // 阶段 1：关键词精确匹配（exact → alias → partial）
  const candidates = keywordMatch(normalizedTerm, nodes);

  // 阶段 2：精确匹配无结果时，进入模糊匹配（由 matchNodeByTermAsync 统一调度）
  // 注意：matchNodeByTerm 是纯同步函数，不调用语义 transformer，
  //      fuzzyFallback 仅作为最后的字符串级兜底。
  if (candidates.length === 0) {
    const fuzzy = fuzzyFallback(normalizedTerm, nodes);
    return {
      candidates: fuzzy,
      autoSelect: fuzzy.length === 1 && fuzzy[0].node !== null
    };
  }

  // 阶段 3：截断 + 确定 autoSelect
  return {
    candidates: candidates.slice(0, 5),
    autoSelect: candidates.length === 1
  };
}

/**
 * 关键词精确匹配：title 精确、别名精确
 *
 * 只做高置信度匹配，不做模糊子串（避免 "c" → "Binary Basics" 这类误匹配）。
 * 模糊匹配统一由 fuzzyFallback 处理。
 */
function keywordMatch(
  term: string,
  nodes: MapNodeDocument[]
): MatchCandidate[] {
  const results: MatchCandidate[] = [];

  for (const node of nodes) {
    const hints = generateContextHints(node);
    const titleLower = node.title.toLowerCase();

    // 1. 精确匹配 title
    if (titleLower === term) {
      results.push({
        node,
        matchType: 'exact',
        contextHints: hints,
        score: 1.0
      });
      continue;
    }

    // 2. 别名精确匹配
    if (node.aliases?.some((alias: string) => alias.toLowerCase() === term)) {
      results.push({
        node,
        matchType: 'alias',
        contextHints: hints,
        score: 0.9
      });
    }

    // 3. 部分匹配（双向子串包含，term 长度 >= 3 才做，避免单字符误匹配）
    if (term.length >= 3) {
      if (titleLower.includes(term) || term.includes(titleLower)) {
        const score = titleLower.includes(term) ? 0.8 : 0.7;
        results.push({
          node,
          matchType: 'partial',
          contextHints: hints,
          score
        });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * 模糊兜底匹配：基于字符串相似度的模糊匹配
 *
 * 触发条件：关键词精确匹配（keywordMatch）返回空集。
 * 仅对有效长度的 term 进行模糊搜索，避免极短输入误匹配。
 */
function fuzzyFallback(
  term: string,
  nodes: MapNodeDocument[]
): MatchCandidate[] {
  // term 长度 < 3：太短，无法做有效模糊匹配，直接返回空
  if (term.length < 3) {
    return [{
      node: null,
      matchType: 'non-tech',
      contextHints: [`"${term}" 太短，请输入更完整的术语（如 "css"、"http"）`],
      score: 0
    }];
  }

  // 计算所有节点的字符串相似度
  const scored = nodes
    .map(node => ({
      node,
      score: computeSimilarity(term, node)
    }))
    .filter(item => item.score >= 0.5); // 仅保留有效候选

  if (scored.length === 0) {
    return [{
      node: null,
      matchType: 'non-tech',
      contextHints: [`未找到 "${term}" 相关节点，请尝试其他关键词`],
      score: 0
    }];
  }

  // 取 TOP 5，按 score 降序
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ node, score }) => ({
      node,
      matchType: 'fuzzy',
      contextHints: [
        `未找到精确匹配，以下节点可能与 "${term}" 相关：`,
        ...generateContextHints(node)
      ],
      score
    }));
}

/**
 * 字符串相似度计算（仅供 fuzzyFallback 调用）
 *
 * 分为两层，优先级递减：
 *  1. 子串包含（高置信度）：term >= 3, title/alias >= 3
 *  2. 拼写纠错（低置信度）：term >= 4, title/alias >= 4, ld <= 2
 *
 * 返回值范围：[0.5, 0.8]，低于 0.5 的不返回（已在 fuzzyFallback 过滤）
 */
function computeSimilarity(term: string, node: MapNodeDocument): number {
  const termLower = term.toLowerCase();
  const titleLower = node.title.toLowerCase();

  // ── 层 1：子串包含（高置信度）──────────────────────────────
  // 条件：term >= 3 且 title >= 3
  if (termLower.length >= 3 && titleLower.length >= 3) {
    if (titleLower.includes(termLower)) return 0.8;  // title 包含 term（如 "http" 在 "HTTPS" 中）
    if (termLower.includes(titleLower)) return 0.7;  // term 包含 title（如 "hypertext" 包含 "http"）
  }

  // 别名子串包含
  if (node.aliases) {
    for (const alias of node.aliases) {
      const aliasLower = alias.toLowerCase();
      if (termLower.length >= 3 && aliasLower.length >= 3) {
        if (aliasLower.includes(termLower)) return 0.75; // alias 包含 term
        if (termLower.includes(aliasLower)) return 0.65; // term 包含 alias
      }
    }
  }

  // ── 层 2：拼写纠错（低置信度）──────────────────────────────
  // 条件：term >= 4 且 title/alias >= 4，编辑距离 ld <= 2
  if (termLower.length >= 4 && titleLower.length >= 4) {
    const ld = levenshtein(termLower, titleLower);
    if (ld <= 2) {
      return ld === 1 ? 0.6 : 0.5;
    }
  }

  // 别名拼写纠错
  if (node.aliases) {
    for (const alias of node.aliases) {
      const aliasLower = alias.toLowerCase();
      if (termLower.length >= 4 && aliasLower.length >= 4) {
        const ld = levenshtein(termLower, aliasLower);
        if (ld <= 2) {
          return ld === 1 ? 0.6 : 0.55;
        }
      }
    }
  }

  return 0;
}

/**
 * Levenshtein 编辑距离（动态规划）
 *
 * 时间复杂度：O(m * n)，m = len(a), n = len(b)
 * 适用于短字符串（输入词通常 < 20 字符）
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // 处理空字符串
  if (m === 0) return n;
  if (n === 0) return m;

  // 初始化 DP 表格
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => {
      if (i === 0) return j;
      if (j === 0) return i;
      return 0;
    })
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // 删除
          dp[i][j - 1],     // 插入
          dp[i - 1][j - 1]  // 替换
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * 意图黑名单判断
 *
 * 仅覆盖最常见的非计算机话题（故意非常小，避免误伤）
 * 误判成本：把非技术词当作技术词兜底 → 用户看到几个不相关的节点
 * 漏判成本：把技术词当作非技术词 → 用户得到"友好提示"而非有用结果
 *
 * 策略：宁可漏判（提示用户尝试其他关键词），也不把非技术词兜底成技术候选
 */
function isLikelyNonTech(term: string): boolean {
  const NON_TECH_BLACKLIST = [
    // 天气相关
    "天气", "天气预报", "温度", "气温", "下雨",
    // 问候语
    "你好", "您好", "hello", "hi", "hey",
    // 感谢/告别
    "谢谢", "感谢", "再见", "拜拜",
    // 个人信息
    "名字", "你是谁", "你的名字",
    // 时间相关
    "几点", "几点了", "今天星期几", "今天几号",
    // 生活琐事
    "早饭", "午饭", "晚饭", "吃饭", "睡觉", "起床"
  ];

  const lowerTerm = term.toLowerCase();
  return NON_TECH_BLACKLIST.some(phrase =>
    lowerTerm.includes(phrase.toLowerCase())
  );
}

/**
 * 生成上下文提示
 *
 * 从节点的 domain / deps / stage 提取可读信息
 */
function generateContextHints(node: MapNodeDocument): string[] {
  const domainNames: Record<string, string> = {
    fundamentals: "基础概念",
    hardware: "硬件层",
    os: "操作系统",
    network: "网络层",
    programming: "编程层",
    data: "数据层"
  };

  const hints: string[] = [];

  // domain 领域
  hints.push(domainNames[node.domain] || node.domain);

  // deps 前置依赖（最多展示 2 个，避免过长）
  if (node.deps && node.deps.length > 0) {
    const depsPreview = node.deps.slice(0, 2).join(', ');
    const more = node.deps.length > 2 ? ` 等${node.deps.length}个` : '';
    hints.push(`前置依赖: ${depsPreview}${more}`);
  }

  // stage 学习阶段
  hints.push(`Stage ${node.stage}`);

  return hints;
}

/**
 * 将输入字符串切分成多个术语
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

// ---------------------------------------------------------------------------
// Phase 2: 异步语义重排
// ---------------------------------------------------------------------------

/**
 * 语义匹配入口（异步版）
 *
 * 与 matchNodeByTerm 的区别：
 * - 候选数 ≥ 3 时，调用 vectorCache.rerank() 做语义重排
 * - vectorCache 会在首次调用时后台预计算所有节点向量
 *
 * @param term - 用户输入词
 * @param nodes - 地图节点列表
 * @param mapVersion - 地图版本（用于向量缓存失效）
 * @param onVectorProgress - 向量预计算进度回调（可选）
 */
export async function matchNodeByTermAsync(
  term: string,
  nodes: MapNodeDocument[],
  mapVersion: string,
  onVectorProgress?: (done: number, total: number) => void
): Promise<MatchResult> {
  // 阶段 1：关键词精确匹配（同步，纯规则）
  const result = matchNodeByTerm(term, nodes);

  if (result.candidates.length === 0) {
    // 阶段 2：精确匹配失败 → 调用语义 transformer
    try {
      await vectorCache.init(nodes, mapVersion, onVectorProgress);
      const semanticResults = await vectorCache.search(term, nodes);

      if (semanticResults.length > 0) {
        // 语义有结果：转为候选并确定 autoSelect
        const candidates: MatchCandidate[] = semanticResults.slice(0, 5).map(item => ({
          node: item.node,
          matchType: 'semantic' as const,
          contextHints: [],
          score: item.score
        }));

        return {
          candidates,
          autoSelect: candidates.length === 1
        };
      }
    } catch (e) {
      console.warn('[matching] Semantic search failed, fallback to fuzzy:', e);
    }

    // 阶段 3：语义也没有 → 字符串级 fuzzy 兜底
    return matchNodeByTerm(term, nodes); // 触发 fuzzyFallback
  }

  // 精确匹配 ≥ 1 个候选 → 候选 ≥ 3 时语义重排
  if (result.candidates.length >= 3) {
    try {
      await vectorCache.init(nodes, mapVersion, onVectorProgress);
      await vectorCache.rerank(result.candidates, term);
    } catch (e) {
      console.warn('[matching] Semantic rerank failed, fallback to keyword order:', e);
    }
  }

  return result;
}

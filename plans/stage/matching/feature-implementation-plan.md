# 语义匹配功能实现计划

> 所属分支：`feature-matching`
>
> 目标：为 Computer-World-Frame 项目实现"用户输入词 → 匹配知识节点"的全套语义匹配功能。
>
> 决策依据：`../explainationAI/semantic-matching-design.md`

---

## 1. 设计决策汇总

| 决策项 | 决定 |
|--------|------|
| **左侧列表展示** | 仅展示最近一次点亮的节点 |
| **重置按钮** | 清空整个会话，回到初始状态 |
| **撤销按钮** | 撤销最近一次点亮，支持连续撤销多次 |
| **多候选触发条件** | 关键词匹配结果 ≥ 3 个时触发多候选模式 |
| **单候选处理** | 自动选中最佳匹配，用户无感知 |
| **兜底匹配策略** | **动态兜底**——基于当前地图的 title + aliases 字符串相似度，不是写死的关键词词典 |

---

## 2. 兜底匹配的核心设计

### 2.1 为什么不用写死的关键词词典？

如果兜底逻辑写死为几个关键词（如 `["docker", "react", "vue"]`），会有以下问题：

- **地图一变就要改代码**：新增节点后必须同步更新词典
- **无法覆盖长尾术语**：只维护核心词，漏掉大量边缘术语
- **维护成本高**：词典与地图数据容易不同步

### 2.2 动态兜底的实现思路

当关键词精确匹配返回空集时，**遍历当前地图中所有节点**，计算输入词与每个节点 title/aliases 的字符串相似度，取 TOP-K 作为"可能想找的"候选。

```
用户输入 "docker compose"（地图中没有此节点）
    ↓
遍历地图所有节点，找相似词
    ↓
[Docker (score 0.8), Container (0.6), Docker Swarm (0.7), Compose (0.5)]
    ↓
展示友好提示，引导用户选择
```

**相似度算法**：
1. **包含匹配**：节点 title 包含输入词，或反之（score 0.7-0.8）
2. **编辑距离**（Levenshtein）：容错用户输入，如 "dockr" → "docker"（score 0.6-0.5）
3. **前缀匹配**：输入词是节点 title 的前缀（score 0.6）

### 2.3 意图分析层（可选增强）

在动态兜底之前，可以加一个**极轻量的意图判断**，区分"非计算机话题"与"计算机术语但地图未收录"：

```typescript
// 极简黑名单（仅覆盖最常见的非技术输入）
const NON_TECH_BLACKLIST = [
  "天气", "你好", "hi", "hello", "谢谢", "再见",
  "名字", "你是谁", "几点了", "今天星期几"
];

function isLikelyNonTech(term: string): boolean {
  return NON_TECH_BLACKLIST.some(phrase =>
    term.toLowerCase().includes(phrase.toLowerCase())
  );
}
```

这个黑名单**故意非常小**，只过滤掉明显非技术的输入，避免误伤用户的探索尝试。

---

## 3. 完整匹配流程

```
用户输入 term
    ↓
[阶段1：关键词匹配]
    ├─ 精确匹配 title          → score = 1.0
    ├─ 别名匹配 aliases         → score = 0.9
    └─ 部分匹配 title          → score = 0.5-0.8
    ↓ 结果数 ≥ 3？
    ├─ 是 → 进入 [阶段2：语义重排]（可选）
    └─ 否 → 结果数 = 1？
              ├─ 是 → 自动点亮该节点
              └─ 否（=0）→ 进入 [阶段3：动态兜底]
                       ↓
              [阶段3：动态兜底]
              ├─ 意图黑名单过滤（非技术？）
              │     ├─ 是 → 显示友好提示
              │     └─ 否 → 计算字符串相似度 → TOP-K 候选
              └─ 展示模糊匹配结果供用户选择
```

---

## 4. Phase 1：匹配逻辑重构（1天）

### 4.1 新增文件：`frontend/src/core/matching.ts`（已有，改造）

**扩展返回类型**：

```typescript
export type MatchType = 'exact' | 'alias' | 'partial' | 'fuzzy' | 'suggestion' | 'non-tech';

export interface MatchCandidate {
  node: MapNodeDocument | null;   // null 表示特殊提示（如非技术话题）
  matchType: MatchType;
  contextHints: string[];
  score: number;                   // 0.0 ~ 1.0
}

export interface MatchResult {
  candidates: MatchCandidate[];    // 多候选
  autoSelect: boolean;             // 是否应该自动选中（仅1个候选时为true）
}
```

**改造 `matchNodeByTerm`**：

```typescript
/**
 * 主匹配入口
 *
 * 策略：
 * 1. 关键词精确匹配 → 返回多候选（按 score 降序）
 * 2. 无匹配 → 意图分析 → 动态兜底
 * 3. 候选数 = 1 → autoSelect = true
 * 4. 候选数 = 0 → 返回友好提示
 */
export function matchNodeByTerm(
  term: string,
  nodes: MapNodeDocument[]
): MatchResult {
  const normalizedTerm = term.toLowerCase().trim();
  if (!normalizedTerm) return { candidates: [], autoSelect: false };

  // 阶段1：关键词匹配
  let candidates = keywordMatch(normalizedTerm, nodes);

  // 阶段2：无匹配 → 动态兜底
  if (candidates.length === 0) {
    candidates = fuzzyFallback(normalizedTerm, nodes);
  }

  return {
    candidates: candidates.slice(0, 5),
    autoSelect: candidates.length === 1
  };
}

/**
 * 关键词精确匹配
 */
function keywordMatch(term: string, nodes: MapNodeDocument[]): MatchCandidate[] {
  const candidates: MatchCandidate[] = [];

  for (const node of nodes) {
    const hints = generateContextHints(node);

    // 1. 精确匹配 title
    if (node.title.toLowerCase() === term) {
      candidates.push({ node, matchType: 'exact', contextHints: hints, score: 1.0 });
      continue;
    }

    // 2. 别名匹配
    if (node.aliases?.some((a: string) => a.toLowerCase() === term)) {
      candidates.push({ node, matchType: 'alias', contextHints: hints, score: 0.9 });
      continue;
    }

    // 3. 部分匹配
    const titleLower = node.title.toLowerCase();
    if (titleLower.includes(term) || term.includes(titleLower)) {
      const score = titleLower.includes(term) ? 0.8 : 0.7;
      candidates.push({ node, matchType: 'partial', contextHints: hints, score });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * 动态兜底：字符串相似度匹配
 *
 * 基于当前地图数据动态计算，不依赖写死的关键词词典
 */
function fuzzyFallback(term: string, nodes: MapNodeDocument[]): MatchCandidate[] {
  // 意图黑名单过滤
  if (isLikelyNonTech(term)) {
    return [{
      node: null,
      matchType: 'non-tech',
      contextHints: [
        `未找到 "${term}" 相关节点`,
        `请尝试输入技术术语，如 "API"、"CPU"、"HTTP" 等`
      ],
      score: 0
    }];
  }

  // 字符串相似度匹配
  const scored = nodes
    .map(node => ({
      node,
      score: computeSimilarity(term, node)
    }))
    .filter(s => s.score > 0);

  const sorted = scored.sort((a, b) => b.score - a.score);

  if (sorted.length === 0) {
    return [{
      node: null,
      matchType: 'non-tech',
      contextHints: [`未找到 "${term}" 相关节点，请尝试其他关键词`],
      score: 0
    }];
  }

  return sorted.slice(0, 5).map(({ node, score }) => ({
    node,
    matchType: 'fuzzy',
    contextHints: [
      `未找到精确匹配，"${term}" 可能与以下节点相关：`,
      ...generateContextHints(node)
    ],
    score
  }));
}

/**
 * 字符串相似度计算
 *
 * 结合多种策略：
 * 1. 子串包含（双向）
 * 2. 编辑距离容错（Levenshtein）
 * 3. 前缀匹配
 */
function computeSimilarity(term: string, node: MapNodeDocument): number {
  const termLower = term.toLowerCase();
  const titleLower = node.title.toLowerCase();

  // 子串包含匹配
  if (titleLower.includes(termLower)) return 0.8;
  if (termLower.includes(titleLower)) return 0.7;
  if (titleLower.includes(termLower.slice(0, Math.floor(termLower.length / 2)))) return 0.5;

  // 别名匹配
  if (node.aliases) {
    for (const alias of node.aliases) {
      const aliasLower = alias.toLowerCase();
      if (aliasLower.includes(termLower)) return 0.75;
      if (termLower.includes(aliasLower)) return 0.65;

      // 编辑距离容错（容2个字符误差）
      const ld = levenshtein(termLower, aliasLower);
      if (ld <= 2) return Math.max(0.6 - ld * 0.1, 0.4);
    }
  }

  // 编辑距离容错（节点 title）
  const ld = levenshtein(termLower, titleLower);
  if (ld <= 2) return Math.max(0.5 - ld * 0.1, 0.3);

  return 0;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function isLikelyNonTech(term: string): boolean {
  const NON_TECH_BLACKLIST = [
    "天气", "你好", "hi", "hello", "谢谢", "再见",
    "名字", "你是谁", "几点了", "今天星期几",
    "早饭", "午饭", "晚饭", "睡觉", "起床"
  ];
  return NON_TECH_BLACKLIST.some(phrase =>
    term.toLowerCase().includes(phrase.toLowerCase())
  );
}

function generateContextHints(node: MapNodeDocument): string[] {
  const domainNames: Record<string, string> = {
    fundamentals: "基础概念",
    hardware: "硬件层",
    os: "操作系统",
    network: "网络层",
    programming: "编程层",
    data: "数据层"
  };
  const hints: string[] = [domainNames[node.domain] || node.domain];
  if (node.deps?.length) hints.push(`前置: ${node.deps.join(', ')}`);
  hints.push(`Stage ${node.stage}`);
  return hints;
}
```

### 4.2 任务清单

| # | 任务 | 依赖 |
|---|------|------|
| 1 | 定义 `MatchCandidate` 和 `MatchResult` 类型 | 无 |
| 2 | 改造 `matchNodeByTerm` 返回 `MatchResult` | 1 |
| 3 | 实现 `keywordMatch`（精确 + 别名 + 部分匹配） | 1 |
| 4 | 实现 `fuzzyFallback`（动态兜底 + 意图黑名单） | 1 |
| 5 | 实现 `generateContextHints` | 无 |
| 6 | 实现 `levenshtein` + `computeSimilarity` | 无 |
| 7 | 单元测试覆盖 | 1-6 |

**验收标准**：

| 输入 | 期望 | autoSelect |
|------|------|------------|
| `"api"` | 多候选列表（≥3） | `false` |
| `"http"` | 精确匹配 1 个 | `true` |
| `"os"` | 别名匹配 1 个 | `true` |
| `"docker compose"` | 动态兜底（地图中找相似节点） | `false` |
| `"今天天气"` | 非技术话题提示 | `false` |

---

## 5. Phase 2：语义重排（可选增强，2-3天）

### 5.1 触发条件

候选数量 ≥ 3 时，对候选进行语义重排，将最符合语义的节点排到前面。

### 5.2 技术选型

| 模型 | 参数量 | 大小 | 特点 |
|------|--------|------|------|
| all-MiniLM-L6-v2 | 23M | ~80MB | 专为浏览器优化，Transformers.js 支持 |
| all-MiniLM-L6-v2-Q8 | - | ~40MB | INT8 量化版，更小更快 |

### 5.3 向量缓存策略

- **时机**：地图加载完成后，后台预计算所有节点向量
- **存储**：IndexedDB（键名 `cwframe-vectors-${mapVersion}`）
- **失效条件**：`mapVersion` 变化时自动重建
- **降级**：Transformers.js 加载失败或 IndexedDB 不可用时，静默回退到纯规则排序

### 5.4 语义重排集成

```typescript
import { vectorCache } from './vector-cache'; // Phase 2 新建

export async function matchNodeByTermAsync(
  term: string,
  nodes: MapNodeDocument[]
): Promise<MatchResult> {
  // 阶段1：关键词匹配（同步）
  let candidates = keywordMatch(term, nodes);

  if (candidates.length === 0) {
    candidates = fuzzyFallback(term, nodes);
  }

  // 阶段2：语义重排（仅在候选 ≥ 3 时触发）
  if (candidates.length >= 3) {
    try {
      await vectorCache.init();
      candidates = await vectorCache.rerank(candidates, term);
    } catch (e) {
      console.warn('[matching] Semantic rerank failed, fallback to keyword order:', e);
    }
  }

  return {
    candidates: candidates.slice(0, 5),
    autoSelect: candidates.length === 1 && candidates[0].node !== null
  };
}
```

---

## 6. Phase 3：UI 交互与反悔机制（1-2天）

### 6.1 左侧列表设计

**状态定义**：

```typescript
interface SearchSessionState {
  // 左侧列表：仅保留最近一次点亮的节点
  lastActivatedNode: MapNodeDocument | null;

  // 撤销栈：历史点亮记录（支持连续撤销）
  undoStack: MapNodeDocument[];

  // 当前候选列表（临时显示）
  currentCandidates: MatchCandidate[];

  // 是否展示候选列表
  showCandidates: boolean;
}
```

**操作语义**：

| 操作 | lastActivatedNode | undoStack |
|------|-------------------|-----------|
| 点亮节点 | = 该节点 | push(该节点) |
| 撤销 | = undoStack.pop() | pop() |
| 重置 | = null | = [] |

### 6.2 按钮设计

**重置按钮**：
- 位置：搜索框右侧
- 状态：始终可用
- 效果：清空所有状态（`lastActivatedNode = null`，`undoStack = []`，`currentCandidates = []`，`showCandidates = false`）

**撤销按钮**：
- 位置：重置按钮左侧
- 默认状态：禁用（`undoStack.length === 0`）
- 可用状态：显示可撤销次数，如 `撤销(2)`
- 点击效果：`lastActivatedNode = undoStack.pop()`

### 6.3 候选列表 UI

```
┌─────────────────────────────────────┐
│ [重置] [撤销(1)] [搜索框...]        │
├─────────────────────────────────────┤
│ 未找到 "docker compose"，是否在找：  │
│ [0] Docker          Programming · 前置: Linux │
│ [1] Container        Programming              │
│ [2] Docker Swarm    Network · 前置: Docker    │
└─────────────────────────────────────┘
```

**交互**：
- 键盘上下键导航
- 回车确认选中
- 输入文字实时过滤候选（候选列表内模糊匹配）
- 300ms 防抖后自动展开（用户停止输入时）
- 点击列表项 = 点亮该节点

---

## 7. 数据层扩展

### 7.1 MapNodeDocument 建议新增字段

```typescript
// MapNodeDocument 扩展（可选，逐步完善）
interface MapNodeDocument {
  // ... 现有字段 ...

  // 建议新增（Phase 3+ 数据完善时添加）
  description?: string;       // 一句话描述（用于向量语义计算）
  exampleAliases?: string[];  // 更多常见别称（提升召回率）
}
```

`description` 字段是向量语义计算的"含义载体"，优先级最高。

### 7.2 向量缓存结构

```typescript
interface NodeVectorCache {
  version: string;                          // 与 mapVersion 对齐
  vectors: Record<string, number[]>;       // nodeId → 384维向量
  computedAt: number;                       // 时间戳
}
```

---

## 8. 测试用例

### 8.1 匹配逻辑测试

| 输入 | 地图节点 | 期望行为 | autoSelect |
|------|----------|----------|------------|
| `"api"` | Web API, REST API, ThirdParty API, API Gateway | 多候选列表 | `false` |
| `"http"` | HTTP | 精确匹配 1 个，自动点亮 | `true` |
| `"os"` | Operating System (aliases: ["os"]) | 别名匹配 1 个 | `true` |
| `"dockr"`（拼错） | Docker | 编辑距离兜底 | `false` |
| `"docker compose"` | 无此节点，但 Docker, Container 存在 | 动态模糊匹配 | `false` |
| `"今天天气"` | 无此节点 | 非技术话题友好提示 | `false` |
| `"今天几号"` | 无此节点 | 非技术话题友好提示 | `false` |

### 8.2 撤销/重置测试

| 操作序列 | lastActivatedNode | undoStack.length | 左侧列表 |
|----------|-------------------|-------------------|----------|
| 输入 "http" → 选中 HTTP | HTTP | 1 | HTTP |
| 点击 [撤销] | null | 0 | 清空 |
| 输入 "api" → 选中 Web API | Web API | 1 | Web API |
| 点击 [撤销] | null | 0 | 清空 |
| 点击 [重置] | null | 0 | 清空（无变化） |
| 点击 [重置]（已是空） | null | 0 | 清空（幂等，无异常） |

### 8.3 连续撤销测试

| 操作序列 | undoStack 变化 |
|----------|----------------|
| 依次点亮 A, B, C | [A, B, C] |
| 撤销一次 | [A, B]，左侧 = B |
| 再撤销一次 | [A]，左侧 = A |
| 再撤销一次 | []，左侧 = null |
| 再撤销一次 | []，左侧 = null（无操作） |

---

## 9. 实施时间表

| Phase | 工作内容 | 预计工时 | 依赖 |
|-------|----------|----------|------|
| Phase 1 | matching.ts 重构（多候选 + 动态兜底 + 上下文提示） | 1 天 | 无 |
| Phase 2 | Transformers.js 集成 + 向量缓存 | 2-3 天 | Phase 1 完成 |
| Phase 3.1 | 左侧列表 + 撤销/重置按钮 | 0.5 天 | Phase 1 完成 |
| Phase 3.2 | 候选列表 UI + 键盘交互 | 0.5 天 | Phase 3.1 完成 |

**总预计**：3-4 天（不含数据补全）

---

## 10. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 动态兜底结果不理想 | 用户感到"答非所问" | 编辑距离阈值调优 + 最小 score 过滤（< 0.3 不展示） |
| 意图黑名单误判 | 非技术词被当作技术词兜底 | 黑名单极小化 + 依赖用户反馈迭代 |
| Transformers.js 体积大 | 首次加载慢 | 欢迎页后台预加载 + 首次使用 loading 提示 |
| 向量计算阻塞 UI | 候选展示延迟 | Web Worker 后台计算（Phase 2 优化时处理） |
| 撤销栈过长 | 内存占用 | 设置最大栈深（如 50），超出时丢弃最旧记录 |

---

## 11. 参考资料

- [all-MiniLM-L6-v2 - HuggingFace](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [Transformers.js 文档](https://huggingface.co/docs/transformers.js)
- [语义匹配设计文档](../explainationAI/semantic-matching-design.md)

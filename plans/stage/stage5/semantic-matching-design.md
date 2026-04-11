# 语义消歧与多选匹配方案

> 记录 Computer-World-Frame 项目中"用户输入词 → 匹配知识节点"环节的方案研究与决策过程。

---

## 1. 问题本质

用户在探索知识图谱时，通过输入关键词来点亮节点。当前 `matching.ts` 中的匹配逻辑是：

1. 精确匹配节点 title
2. 精确匹配节点 aliases
3. 部分匹配 title

**核心矛盾**：这个逻辑只返回第一个匹配结果。当用户的输入存在多义性时（典型如 "API" 可以是 Web API、第三方 API、操作系统 API 等多个语义），用户根本没有选择权——系统直接替他做了决定。

这导致两个问题：

- **false negative**：用户想要的节点没有被匹配到（因为不是第一个）
- **语义混淆**：匹配到的节点在用户的认知语境里并不是"对的"那个

对于一个"探索用户脑中框架体系"的产品来说，**匹配错了比找不到更糟糕**，因为用户会失去对产品的信任。

---

## 2. 方案光谱

解决这个问题有多个档位的方案，从纯规则到端侧 AI，形成一个连续的光谱：

```
纯规则匹配
    ↓
规则 + metadata 上下文
    ↓
关键词快筛 + 轻量向量语义重排
    ↓
端侧小模型推理（Transformers.js）
    ↓
云端大模型（LLM API）
```

我们按"速度"和"准确性"两个维度来分析每一档。

---

## 3. 各方案分析

### 3.1 纯规则 + metadata 上下文（无 AI）

**思路**：不给输入加 AI 能力，而是让匹配结果带上更多的上下文信息，让用户自己判断选哪个。

**做法**：

```typescript
interface MatchCandidate {
  node: MapNodeDocument;
  matchType: 'exact' | 'alias' | 'partial';
  contextHints: string[];   // 从 metadata 生成的提示
}
```

`contextHints` 的生成完全靠现有数据结构：

- `domain`：这个节点属于哪个领域（"Network"、"Programming"）
- `deps`：这个节点的前置依赖节点标题（"是 HTTP 的前置依赖"）
- `stage`：这个节点处于哪个学习阶段
- `tags`：显式的标签（如果有的话）

用户输入 "API" 时，展示：

```
[0] Web API  (Network · 依赖: DNS, TCP · Stage 4)
[1] REST API  (Network · 依赖: HTTP · Stage 4)
[2] ThirdParty API  (Programming · 依赖: JavaScript, TypeScript · Stage 3)
```

**优点**：
- 实现简单，完全无依赖
- 零额外计算，响应速度极快
- 可解释：用户能看到为什么匹配到这个节点

**缺点**：
- 无法处理词义相近但不完全匹配的情况（"how does the internet work" → 找不到）
- `contextHints` 的生成依赖数据结构完整度，如果节点的 deps 为空，提示很弱

**适用场景**：作为**兜底方案**，所有其他方案都应该fallback到这里。

---

### 3.2 关键词快筛 + 语义向量重排（推荐）

**思路**：先用快速的关键词匹配筛出一批候选集，然后用**轻量语义向量模型**对候选进行重排，把最符合语义的结果排到前面。

这个思路的核心洞察是：**用户的输入不需要全程 AI 处理**，只有在"关键词匹配结果超过 N 个"时才需要 AI 来做判断。候选集通常很小（≤ 10个），语义重排的计算量极低。

**技术选型**：

| 模型 | 参数量 | 大小 | 特点 |
|------|--------|------|------|
| all-MiniLM-L6-v2 | 23M | ~80MB | 专为浏览器优化，Transformers.js 支持 |
| all-MiniLM-L6-v2-Q8 | - | ~40MB | INT8 量化版，更小更快 |

**实现架构**：

```
用户输入
    ↓
[阶段1: 关键词匹配] — O(n) 全量扫描，< 1ms
    ↓ 得到候选集（通常 3~10 个）
[阶段2: 语义重排] — 仅对候选集调用向量模型
    ↓
[展示多选列表]
```

阶段2只处理候选集，不需要处理全量节点。即使向量推理在 CPU 上跑，10个候选的向量相似度计算也在毫秒级别内完成。

**Transformer.js 集成方式**：

```typescript
// 预加载阶段（应用启动时，一次性加载）
import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';

let extractor: FeatureExtractionPipeline;
async function initEmbedding() {
  extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
}

// 语义重排阶段
async function rerankCandidates(
  input: string,
  candidates: MapNodeDocument[]
): Promise<Array<{ node: MapNodeDocument; score: number }>> {
  if (!extractor || candidates.length === 0) return candidates.map(n => ({ node: n, score: 0 }));

  const inputEmbedding = await extractor(input, { pooling: 'mean', normalize: true });
  const results = await Promise.all(
    candidates.map(async (candidate) => {
      const nodeEmbedding = await extractor(candidate.title, { pooling: 'mean', normalize: true });
      const score = cosineSimilarity(inputEmbedding, nodeEmbedding);
      return { node: candidate, score };
    })
  );

  return results.sort((a, b) => b.score - a.score);
}
```

**关键设计决策**：

1. **时机**：只在候选数量 ≥ 3 时才触发语义重排。如果只有 1~2 个候选，直接展示，不需要额外计算。
2. **缓存**：节点的向量表示可以**预计算**并缓存到 localStorage，每个节点只算一次，启动时批量加载。
3. **Fallback**：如果 Transformers.js 加载失败（比如某些浏览器不支持 WASM），静默回退到纯规则模式。
4. **模型下载**：首次使用时下载模型文件（~80MB），下载完成后缓存在浏览器中，后续使用不再下载。

**优点**：
- 响应速度可控：阶段1极快，阶段2只在必要时触发
- 语义理解能力大幅提升：能处理"how internet works" → DNS/HTTP 相关节点
- 数据完全在本地，隐私安全
- 模型只加载一次，后续使用无网络延迟

**缺点**：
- 首次加载有 ~80MB 的模型下载成本（可以在欢迎页后台预加载）
- 向量预计算有初始启动时间

---

### 3.3 纯端侧 LLM 推理

**不推荐**。虽然可以在浏览器里跑 LLM（如通过 WebLLM 项目），但对于"从 5~10 个候选里选最优"这个任务来说：

- LLM 的推理时间（即使是 7B 级别）远超用户等待阈值（> 500ms）
- 模型体积（数 GB）远超 MiniLM 的 80MB
- 语义判断对于这么小的候选集来说 overkill

**结论**：对于这个场景，LLM 是杀鸡用牛刀。

---

### 3.4 云端 LLM API

**不推荐作为主要方案**，但可以作为**高级功能**：

当用户的输入**完全无法匹配**任何节点时（即关键词匹配返回空集），可以调用 LLM 来做语义推断：

```
用户输入 "how the computer understand our code"
    ↓
关键词匹配 → 空集
    ↓
[调用 LLM] "以下哪些节点与用户输入的语义最相关？..."
    ↓
返回兜底建议
```

这样 LLM 只在**匹配失败时才触发**，调用频率极低，成本可控。

---

## 4. 推荐方案

**采用两阶段策略：规则快筛 + 语义重排**

```
输入 "api"
    ↓
关键词匹配得到 [Web API, REST API, ThirdParty API, API Gateway]
    ↓（候选 ≥ 3）
语义重排（MiniLM）→ 按语义相似度排序
    ↓
展示候选列表，每个带上下文提示
    ↓
用户选择其中一个（或输入更精确的词）
```

**多选列表的 UI 设计**：

候选列表应该放在**搜索框下方**，以浮层形式展示：

```
┌─────────────────────────────┐
│ api                     🔍 │
├─────────────────────────────┤
│ [0] Web API               │  ← keyboard 可选中
│     Network · HTTP 前置依赖 │
│                             │
│ [1] REST API              │
│     Network · 依赖 HTTP    │
│                             │
│ [2] ThirdParty API        │
│     Programming · JS/TS 共用│
└─────────────────────────────┘
```

**交互细节**：

- 键盘上下键选中，回车确认
- 输入文字实时过滤候选（模糊匹配）
- 如果输入文字在 300ms 内没有变化，自动展开候选列表
- 最多展示 5 个候选，超出的折叠处理

---

## 5. 数据层准备

要让这个方案生效，以下字段必须保持高质量：

### 5.1 必要的字段

| 字段 | 作用 | 当前状态 |
|------|------|----------|
| `title` | 主要匹配目标 | ✅ 已有 |
| `aliases` | 同义词匹配 | ✅ 已有（部分节点缺失） |
| `domain` | 上下文提示 | ✅ 已有 |
| `deps` | 依赖关系 | ✅ 已有（但没有反向索引） |

### 5.2 建议新增的字段

```typescript
// MapNodeDocument 扩展
interface MapNodeDocument {
  // ... 现有字段
  description?: string;        // 一句话描述，用于语义向量计算
  exampleAliases?: string[];   // 更多的常见别称，提升召回率
  relatedTerms?: string[];     // 相关但不等价的概念（用于语义扩展）
}
```

其中 `description` 字段最重要——它是向量模型的"含义载体"。如果一个节点叫"Virtual Memory"，它的 description 可以是"操作系统通过地址映射让程序使用比实际物理内存更大的地址空间的技术"，向量模型能从中理解它的语义。

### 5.3 向量缓存策略

```typescript
interface NodeVectorCache {
  version: string;               // 与 mapVersion 对齐，版本变化时重建
  vectors: Record<string, number[]>;  // nodeId → 384维向量
}

// 预计算时机：地图加载完成后，后台计算所有节点的向量
// 存储位置：IndexedDB（比 localStorage 更适合存二进制数据）
```

---

## 6. 实现计划

### Phase 1：metadata 上下文兜底（1天）

- 修改 `matchNodeByTerm` 返回 `MatchCandidate[]` 而不是单个节点
- 为每个候选生成 `contextHints`（从 domain、deps、stage 提取）
- UI 增加候选列表下拉
- 这个阶段用户体验就比现在好很多了

### Phase 2：向量语义重排集成（2~3天）

- 引入 Transformers.js
- 实现向量预计算和缓存逻辑
- 集成 MiniLM 语义重排
- 完善 fallback 机制

### Phase 3：数据质量提升（持续）

- 补全缺失的 `aliases`
- 撰写 `description` 字段
- 收集用户实际输入词，识别漏掉的别名

---

## 7. 参考资料

- [all-MiniLM-L6-v2 - HuggingFace](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)：当前最快的语义向量模型，23M 参数，80MB
- [Transformers.js 文档](https://huggingface.co/docs/transformers.js)：在浏览器中运行 Transformer 模型
- [Transformers.js - Run AI Models in Browser](https://dev.to/programmingcentral/run-ai-models-in-your-browser-the-ultimate-guide-to-transformersjs-5f57)：实践指南

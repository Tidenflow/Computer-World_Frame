# 图谱渲染优化思路

> 记录 Computer-World-Frame 项目中渲染层的优化方向与设计决策。

---

## 概述

当前渲染面临的核心挑战是**连线密集导致视觉混乱**，以及**布局缺乏结构感**。这两个问题相互影响：连线越密，布局越难读；布局越无结构，连线越显得杂乱。

本方案从四个方向同时推进，优先级从高到低：
1. 边的分层视觉设计（见效最快）
2. Domain 感知的布局（工程成本低，收益大）
3. 正交总线布局（视觉效果显著，但需权衡实现成本）
4. 聚焦时的边折叠（交互增强，适合复杂区域）

---

## 1. 边的分层视觉设计

### 1.1 问题分析

当前 `CWFrameGraph.vue` 中，边的样式只有两种：

```typescript
// CWFrameGraph.vue 第 470~478 行
.link-line.full {
  stroke: rgba(96, 165, 250, 0.62);
  stroke-width: 2.35;
}
.link-line.partial {
  stroke: rgba(148, 163, 184, 0.34);
  stroke-width: 1.65;
}
```

这意味着：**无论两个 Unlocked 节点之间的关系多重要，边都是同一个样式**。当一个 Unlocked 节点的 deps 里有 5 个 Outlined 节点、2 个 Unlocked 节点时，所有边的视觉权重都一样，用户无法区分"这是我刚点亮的路径"和"普通的连接"。

### 1.2 边的三级分层

将边的样式从 2 级扩展到 3 级：

```
高优先级边（primary）
  - 条件：source 和 target 都是 Unlocked，且 target 是"最近解锁"的
  - 样式：深色、较粗、完整动画、实线

中优先级边（secondary）
  - 条件：source 和 target 都是 Unlocked，但不是最近路径上的
  - 样式：正常颜色、正常粗细

低优先级边（tertiary）
  - 条件：source 或 target 是 Outlined
  - 样式：极淡、较细、虚线
```

具体数值建议：

```typescript
// 边的视觉权重
const EDGE_STYLES = {
  primary: {
    stroke: 'rgba(96, 165, 250, 0.85)',
    strokeWidth: 2.8,
    dashArray: 'none',       // 实线
    animation: 'full-flow',  // 流动动画
  },
  secondary: {
    stroke: 'rgba(96, 165, 250, 0.50)',
    strokeWidth: 2.0,
    dashArray: 'none',
    animation: 'none',
  },
  tertiary: {
    stroke: 'rgba(148, 163, 184, 0.22)',
    strokeWidth: 1.2,
    dashArray: '6,4',        // 虚线
    animation: 'none',
  },
};
```

**为什么这个方案有效**：人的视觉系统对"颜色深浅 + 线条粗细 + 是否动画"的组合非常敏感。3 级分层能让用户在 100ms 内就区分出"重要路径"和"普通连接"，大幅降低认知负担。

### 1.3 边的流动动画（可选增强）

对于 `primary` 级别的边，可以加一个流动动画，暗示信息的流向：

```css
@keyframes edge-flow {
  0%   { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -24; }
}
.link-line.primary {
  stroke-dasharray: 12 12;
  animation: edge-flow 0.8s linear infinite;
}
```

注意：动画只加在 `primary` 边上，中低优先级边保持静态，以避免视觉干扰。

---

## 2. Domain 感知的布局

### 2.1 问题分析

当前布局算法完全忽略了 `domain` 字段，所有节点按深度（`depth`）排列，但同一 domain 的节点可能散落在图的各个位置。这导致两个问题：

- 用户无法靠"位置"形成对领域边界的直觉感知
- 跨 domain 的连线（实际上很多）和其他连线视觉上无法区分

### 2.2 方案：根节点按 domain 分组

不需要改 `layoutGraphTree` 的核心算法，只需要改变**根节点 band 的分配方式**：

```typescript
// 在 layoutGraphTree 函数中，调整 roots 的处理顺序

// 1. 将根节点按 domain 分组
function groupRootsByDomain(roots: MapNodeDocument[]): MapNodeDocument[][] {
  const groups: Record<string, MapNodeDocument[]> = {};

  for (const root of roots) {
    if (!groups[root.domain]) groups[root.domain] = [];
    groups[root.domain].push(root);
  }

  // 按 domains 定义的顺序排列
  return domains
    .map(d => d.id)
    .filter(domainId => groups[domainId])
    .map(domainId => groups[domainId]);
}
```

```
布局效果（调整后）：

y=0
│  Fundamentals │ Hardware │ OS │ Network │ Programming │ Data │
│    [roots]     │ [roots]  │    │ [roots] │  [roots]    │      │
│                │          │    │         │             │      │
│  ──────────────────────────────────────────────────────────────│ ← Domain 分界线
│    children... │ children │    │ children│  children   │      │
y=height
```

每个 domain 区域内部仍然使用现有的叶子权重分配逻辑，只是根节点的初始 band 分配被 domain 分组了。

### 2.3 跨 domain 边的淡化

这是关键的一步：**当一条边的两个端点不属于同一个 domain 时，降低其视觉权重**。

```typescript
function getEdgeVariant(link: GraphTreeLink): 'primary' | 'secondary' | 'tertiary' {
  const sourceNode = nodeById[link.sourceNodeId];
  const targetNode = nodeById[link.targetNodeId];

  if (sourceNode.domain !== targetNode.domain) {
    return 'tertiary';  // 跨 domain 边，强制降级
  }

  // 同 domain 的边，正常走优先级判断逻辑
  // ...
}
```

**为什么这样做有效**：跨 domain 的连接（如 Programming → Network）天然是少数，将它们淡化后，**同一 domain 内的结构关系变得清晰**，而跨域关系仍然存在（只是次要了）。

### 2.4 视觉分隔线

在 domain 区域之间，可以添加极淡的垂直分隔线（不可交互，只是视觉引导）：

```svg
<!-- 在 CWFrameGraph.vue 的 layer-links 中添加 -->
<line
  v-for="(x, idx) in domainDividers"
  :key="'divider-' + idx"
  :x1="x" :y1="0" :x2="x" :y2="VIEWBOX_HEIGHT"
  stroke="rgba(255,255,255,0.04)"
  stroke-width="1"
  stroke-dasharray="4,8"
/>
```

---

## 3. 正交总线布局

### 3.1 问题分析

当前 `buildLinkPath` 生成的是统一方向的贝塞尔曲线：

```typescript
// CWFrameGraph.vue 第 225~232 行
function buildLinkPath(x1: number, y1: number, x2: number, y2: number): string {
  const deltaX = x2 - x1;
  const controlOffsetX = Math.max(Math.abs(deltaX) * 0.45, 40);
  const controlX1 = x1 + controlOffsetX;
  const controlX2 = x2 - controlOffsetX;
  return `M ${x1} ${y1} C ${controlX1} ${y1}, ${controlX2} ${y2}, ${x2} ${y2}`;
}
```

这条线的控制点完全忽略了 y 方向的差异。当 x2 和 y2 都与 x1、y1 不同时，曲线的形状是任意的，没有一致性。

### 3.2 正交线的设计

正交线的核心规则：**所有线段要么水平，要么垂直，没有斜线**。

对于你们的场景（从左到右的树状结构），正交线的走法是：

```
起点 (x1, y1)
    ↓ 垂直向下/向上移动到对齐线
水平总线 (y = targetY 或中间对齐线)
    → 水平移动到目标 x
    ↓ 垂直连接到终点 (x2, y2)
```

实现为 SVG path：

```typescript
function buildOrthogonalPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;

  return [
    `M ${x1} ${y1}`,
    `L ${x1} ${y1}`,           // 起点
    `L ${midX} ${y1}`,         // 水平到中线
    `L ${midX} ${y2}`,         // 垂直到目标高度
    `L ${x2} ${y2}`            // 水平到终点
  ].join(' ');
}
```

**为什么正交线视觉上更整洁**：
- 人的视觉系统能快速追踪"水平-垂直-水平"的路径
- 所有边共享相同的"中线对齐"策略，线与线之间会自然对齐
- 即使边很多，整体仍然是"网格感"，而不是"乱线团"

### 3.3 边的弯曲成本优化（Edge Routing）

在更精细的实现中，可以为每条边计算最优的"拐点"：

```typescript
interface OrthogonalEdge {
  points: Array<{ x: number; y: number }>;
  // 起点 → [拐点1, 拐点2, ...] → 终点
}
```

对于 DAG 结构，一个简单的启发式规则是：
- **源节点高度对齐**：所有从节点 A 出发的边，先垂直移动到 A 的右侧
- **终点高度对齐**：所有进入节点 B 的边，从 B 的左侧进入，水平移动到 B 的中心

这样大量的边会在同一个水平高度上"汇合"，形成视觉上的"总线"效果——这正是 Divided Edge Bundling 论文中描述的核心思想。

### 3.4 评估与风险

| 维度 | 评估 |
|------|------|
| 视觉效果 | ⭐⭐⭐⭐⭐ 显著提升 |
| 实现复杂度 | 中等（需要改 `buildLinkPath` 和相关的样式） |
| 性能影响 | 无显著影响（SVG path 计算量极小） |
| 风险 | 低 |
| 建议优先级 | P2（视觉提升大，建议实现） |

---

## 4. 聚焦时的边折叠

### 4.1 问题分析

当前 `focusNodeInGraph` 只做坐标聚焦（平移 + 缩放），但**所有可见节点和边仍然全部渲染**。当聚焦区域的边密度很高时，用户仍然面对一团乱线。

### 4.2 方案：动态子图裁剪

当用户聚焦到某个节点时，动态计算以该节点为中心的**局部子图**，只渲染 N 跳以内的节点和边：

```typescript
interface LocalSubgraphOptions {
  centerNodeId: string;
  maxDepth: number;        // 展示几跳以内的邻居（建议 1~2）
  includeIncoming: boolean; // 是否展示指向该节点的边
  includeOutgoing: boolean; // 是否展示从该节点出发的边
}

function extractLocalSubgraph(
  allInstances: GraphTreeInstance[],
  allLinks: GraphTreeLink[],
  options: LocalSubgraphOptions
): { instances: GraphTreeInstance[]; links: GraphTreeLink[] } {

  // 1. BFS 从中心节点展开，收集 depth 内的所有 instanceKey
  const includedKeys = new Set<string>();
  const queue: Array<{ key: string; depth: number }> = [
    { key: options.centerNodeId, depth: 0 }
  ];

  while (queue.length > 0) {
    const { key, depth } = queue.shift()!;
    if (depth > options.maxDepth || includedKeys.has(key)) continue;
    includedKeys.add(key);

    // 收集相邻的 links 和 instances
    for (const link of allLinks) {
      if (link.sourceInstanceKey === key && options.includeOutgoing) {
        queue.push({ key: link.targetInstanceKey, depth: depth + 1 });
      }
      if (link.targetInstanceKey === key && options.includeIncoming) {
        queue.push({ key: link.sourceInstanceKey, depth: depth + 1 });
      }
    }
  }

  // 2. 过滤出子图内的实例和边
  const instances = allInstances.filter(i => includedKeys.has(i.instanceKey));
  const links = allLinks.filter(l =>
    includedKeys.has(l.sourceInstanceKey) && includedKeys.has(l.targetInstanceKey)
  );

  return { instances, links };
}
```

### 4.3 切换交互设计

边折叠不应该自动触发，而应该作为用户的**主动操作**：

```
普通模式：展示全图（所有可见节点，密度阈值过滤）
    ↓ 用户双击某个节点
聚焦模式：以该节点为中心的局部子图（1~2跳）
    ↓ 用户点击空白处或按 ESC
返回普通模式
```

切换时加一个平滑的过渡动画：

```css
.local-subgraph-enter-active,
.local-subgraph-leave-active {
  transition: opacity 250ms ease, transform 300ms ease;
}
.local-subgraph-enter-from {
  opacity: 0;
  transform: scale(0.92);
}
.local-subgraph-leave-to {
  opacity: 0;
  transform: scale(1.04);
}
```

### 4.4 折叠状态的视觉标识

在聚焦模式下，需要让用户清楚意识到"这不是全图"：

- 左上角显示当前聚焦范围："显示 2 跳内 · 共 N 个节点"
- 被折叠掉的边有"断点"视觉提示（用虚线表示"这里还有更多边"）
- 或者在节点旁边显示折叠计数："+3 条隐藏边"

---

## 5. 综合路线图

```
当前状态
    ↓
[Phase 1] 边的三级分层 + 跨 domain 边淡化（1天）
    ├── 改动文件：CWFrameGraph.vue
    ├── 改动量：小
    └── 效果：密集连线区域的视觉混乱显著减少
    ↓
[Phase 2] Domain 感知布局 + 视觉分隔线（2天）
    ├── 改动文件：cwframe.layout.ts, CWFrameGraph.vue
    ├── 改动量：中等
    └── 效果：布局产生领域结构感，连线自然分层
    ↓
[Phase 3] 正交总线布局（2天）
    ├── 改动文件：cwframe.layout.ts（或仅 CWFrameGraph.vue 的 buildLinkPath）
    ├── 改动量：中等
    └── 效果：视觉整洁度大幅提升，边多而不乱
    ↓
[Phase 4] 聚焦时边折叠 + UI 反馈（3天）
    ├── 改动文件：CWFrameGraph.vue, map.store.ts（新增局部子图逻辑）
    ├── 改动量：较大（涉及交互状态管理）
    └── 效果：复杂区域可读性大幅提升
```

---

## 6. 技术债务注意

### 6.1 当前路径生成的 bug

`buildLinkPath` 中的控制点选取存在逻辑问题：

```typescript
// 当前代码
const controlX1 = x1 + controlOffsetX;
const controlX2 = x2 - controlOffsetX;
```

这个控制点组合总是生成**水平方向的曲线**（曲线的弯曲只在 x 方向），不管 y1 和 y2 的关系。当 y2 < y1 时（目标节点在上方），曲线会向下凸出再折回，视觉上不自然。

**建议修复**：

```typescript
function buildLinkPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const distX = Math.abs(x2 - x1);
  const distY = Math.abs(y2 - y1);

  // 基于距离动态调整控制点偏移
  const offsetX = Math.max(distX * 0.4, 30);
  const offsetY = distY > 60 ? distY * 0.15 : 0;

  const cp1x = x1 + offsetX;
  const cp1y = y1 + (y2 > y1 ? offsetY : -offsetY);
  const cp2x = x2 - offsetX;
  const cp2y = y2 + (y2 > y1 ? -offsetY : offsetY);

  return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
}
```

### 6.2 layout 函数中的坐标重复写入

在 `cwframe.layout.ts` 的 `layoutGraphTree` 中，`instances` 和 `links` 被**写了两次**——一次在 `assignCoordinates`（第 121~162 行），一次在 `assignCoordinatesWithOffset`（第 177~196 行）。当 `rootBands.length === 1` 时，同一个实例会被写入两次（第二次会覆盖第一次）。

这不会导致明显的 bug（第二次写入会覆盖第一次），但这是一个隐患——当两遍写入的逻辑不一致时（比如以后加了动画状态），会产生难以追踪的问题。

**建议修复**：合并两个 `assignCoordinates` 函数为一个，用参数控制是否应用 `treeOffsetX`。

---

## 7. 参考资料

- [Divided Edge Bundling for Graph Visualization](https://idl.cs.washington.edu/files/2011-DividedEdgeBundling-InfoVis.pdf)：微软研究院，揭示边聚合中的"交通线"思想
- [Winding Roads: Routing edges into bundles](https://core.ac.uk/download/pdf/50076099.pdf)：正交边聚合的经典算法
- [Similarity-Driven Edge Bundling](https://www.academia.edu/164877527/Similarity_Driven_Edge_Bundling_Data_Oriented_Clutter_Reduction_in_Graphs_Layouts)：按相似性聚合边的研究
- [Orthogonal Graph Drawing](https://jgaa.info/index.php/jgaa/article/view/paper391)：正交布局的学术综述

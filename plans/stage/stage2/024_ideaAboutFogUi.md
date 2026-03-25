# Fog of War UI 设计方案

## 1. 设计动机

### 1.1 现有方案的问题

当前实现的"银河风 + 神经网络式"设计存在以下问题：

- **视觉过重**：银河粒子背景喧宾夺主，知识体系本身的结构反而不突出
- **密集恐惧**：所有节点一开始就铺满屏幕，节点一多就杂乱无章
- **缺乏层次感**：用"发光/灰暗"表达状态变化，但整体仍是静态的
- **方向感弱**：神经网络式的自由连接，无法体现知识体系的层次和边界

### 1.2 新方案的核心比喻

> **迷雾（ fog of war）**

> 知识体系是一座被迷雾笼罩的城池。用户用自己的词汇逐层拨开云雾，每次解锁都是一次"发现"的体验。

| 旧方案 | 新方案 |
|---|---|
| 银河风 + 神经网络 | 迷雾探索 |
| 一开始就显示所有节点 | 只显示已知的，其他藏在雾里 |
| 强调节点间的连接关系 | 强调"已知与未知的边界" |
| 静态发光效果 | 动态"拨云见日"的探索感 |

---

## 2. 整体架构

### 2.1 分层设计（从底到顶）

```
Layer 1 — 平面知识图（SVG）
  └── 节点（圆点 + 文字标签） + 连接线
  └── 始终完整显示，作为知识体系的"骨架"
  └── 由 D3-force 根据 dependencies 自动排布

Layer 2 — 迷雾层（Canvas）
  └── 每个节点位置覆盖一个"雾圆"
  └── Locked：雾厚，完全遮盖节点内容
  └── Discoverable：雾薄，隐约感知有东西存在
  └── Unlocked：雾散开，节点完全露出
  └── 雾散开时有过渡动画

Layer 3 — 交互层（Vue DOM）
  └── 点击已解锁节点 → 居中知识卡片
  └── 底部搜索框 + 图例
```

### 2.2 技术选型

| 模块 | 技术方案 | 原因 |
|---|---|---|
| 布局算法 | D3-force | 力学模拟自动排布节点，贡献者无需手动标坐标 |
| 图渲染 | SVG | 矢量渲染，支持连接线和样式，比 Canvas 更适合静态骨架 |
| 迷雾层 | Canvas | 像素级遮罩，可以做雾的动画效果 |
| 状态管理 | Vue 3 Composition API | 保持现有技术栈 |
| 构建工具 | Vite | 保持现有技术栈 |

### 2.3 为什么不用 Three.js

- 迷雾效果在 2D 下更容易实现且性能更好
- 不需要 3D 空间交互（OrbitControls），用户只点节点
- SVG + Canvas 分层比 Three.js 更轻量
- D3.js 在 2D 力导向布局领域是事实标准

---

## 3. 节点状态与迷雾设计

### 3.1 三种状态

| 状态 | 雾厚度 | 节点内容 | 交互 |
|---|---|---|---|
| **Locked** | 100%，完全不透 | 完全不可见 | 不可点击，搜索可解锁 |
| **Discoverable** | 60%，半透明 | 隐约可见轮廓，无文字 | 不可点击，解锁后变为 Unlocked |
| **Unlocked** | 0%，完全散开 | 完整显示文字和发光 | 可点击，弹出知识卡片 |

### 3.2 迷雾视觉

- **颜色**：白色/浅灰色（`rgba(240, 240, 245, 0.95)`）
- **形态**：每个节点位置覆盖一个雾圆，半径略大于节点本身
- **Discoverable 的雾**：不完全均匀，有噪点质感，暗示"有东西但看不清"

### 3.3 雾散开动画（关键体验）

解锁节点时，雾以该节点为圆心向外扩散消散，动画时长约 600ms，使用 ease-out 缓动。

```
解锁瞬间：
  雾圆半径: 40px → 0px（消散）
  opacity: 0.95 → 0
  周围 Locked 节点如果变成 Discoverable：
    其雾圆 opacity 从 0 → 0.6，同时显示 Discoverable 状态
```

---

## 4. 平面知识图设计

### 4.1 D3-force 力导向布局

节点位置由 D3-force 计算，每次加载 Map 时动态生成。

**力学规则：**
- 所有节点互相排斥（避免重叠）
- 有 `dependencies` 关系的节点互相吸引（边作为弹簧）
- 吸引力和距离成正比

**贡献者只需要提供：**
```json
{
  "nodes": [
    { "id": 1, "label": "计算机", "description": "...", "category": "...", "dependencies": [] },
    { "id": 2, "label": "操作系统", "dependencies": [1] }
  ]
}
```

**自动产出**：每个节点的 `(x, y)` 坐标

### 4.2 节点视觉

- **圆点大小**：根据 category 分组，不同 category 不同基础大小
- **连线**：从依赖节点指向当前节点（有向边），线条半透明
- **文字标签**：SVG `<text>`，Unlocked 时显示，Locked/Discoverable 隐藏

### 4.3 连线规则

- 连线始终完整显示（不受迷雾影响），是知识体系的静态骨架
- 已解锁节点之间的连线高亮，未解锁的连线暗淡

---

## 5. 交互设计

### 5.1 解锁流程（保持现有逻辑）

1. 用户在底部输入框输入词汇
2. 匹配到对应节点 → 解锁该节点
3. 该节点雾散开动画
4. 检查依赖链：前置节点若全部解锁，变为 Discoverable

### 5.2 节点点击

1. 只能点击 Unlocked 节点
2. 点击后弹出居中知识卡片（CWFrameLabel）
3. 点击卡片外区域或 × 关闭

### 5.3 底部面板（保持现有逻辑）

- 搜索输入框
- 重置进度按钮
- 图例（Unlocked / Discoverable / Locked）

---

## 6. 数据流

```
loadFrameMap() + loadProgress()
        ↓
buildStatusMap(nodes, progress) → 三种状态
        ↓
D3-force 根据 dependencies 计算节点坐标 (x, y)
        ↓
SVG 渲染节点圆点 + 连接线
Canvas 迷雾层根据 statusMap 渲染雾圆
        ↓
用户输入解锁 → updateStatusMap → 迷雾动画
用户点击节点 → 居中弹窗 CWFrameLabel
```

---

## 7. 组件拆分

### 7.1 组件列表

| 组件 | 职责 |
|---|---|
| `App.vue` | 根组件，状态管理，弹窗控制 |
| `FogMap.vue` | 主画布：包含 SVG 图层 + Canvas 迷雾层 + D3-force 初始化 |
| `FogNode.vue` | 单个节点的 SVG 圆点 + 文字（发光效果） |
| `FogLabel.vue` | 居中知识卡片弹窗（复用现有 CWFrameLabel） |
| `FogControls.vue` | 搜索框、重置按钮、图例 |

### 7.2 FogMap.vue 内部结构

```html
<div class="fog-map">
  <!-- SVG 层：节点 + 连线 -->
  <svg ref="svgRef">
    <g class="links"><!-- 连接线 --></g>
    <g class="nodes"><!-- 节点圆点 --></g>
  </svg>

  <!-- Canvas 层：迷雾 -->
  <canvas ref="canvasRef"></canvas>
</div>
```

---

## 8. 动画细节

### 8.1 雾散开动画

```typescript
// 解锁时，雾从厚到薄
function animateFogDissolve(nodeId: number, onComplete: () => void) {
  const duration = 600;
  const startTime = performance.now();
  const startOpacity = 0.95;
  const endOpacity = 0;

  function tick(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

    drawFog(nodeId, startOpacity + (endOpacity - startOpacity) * eased);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      onComplete();
    }
  }
  requestAnimationFrame(tick);
}
```

### 8.2 Discoverable 雾出现动画

Discoverable 雾以 opacity 0.3 的状态淡入（300ms），表示"这里有东西"。

---

## 9. 已知决策

- [x] D3-force 参数调优 → 先使用默认参数，后续实际数据测试后按需调整
- [x] world-data.json 坐标字段 → 不保留，贡献者无需手动输入坐标
- [x] 迷雾层效果 → 银白色粒子迷雾，使用 Canvas 粒子系统实现
- [x] category 视觉区分 → 暂不考虑，后续有需求再扩展接口

---

## 10. 实现优先级

| 优先级 | 任务 |
|---|---|
| P0 | SVG 基础图渲染（节点 + 连线 + D3-force 布局） |
| P0 | Canvas 迷雾层基础实现（三种透明度） |
| P0 | 解锁 → 雾散开动画 |
| P1 | Discoverable 状态雾 + 动画 |
| P1 | 点击节点 → 居中知识卡片（复用现有） |
| P1 | 搜索框 + 重置（复用现有） |
| P2 | 图例 UI |
| P2 | 噪点纹理迷雾（可选） |

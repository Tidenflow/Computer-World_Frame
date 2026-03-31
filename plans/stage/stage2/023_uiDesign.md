# Stage 2.3 UI 设计方案

## 视觉风格

- **整体风格**：2.5D 科幻风格，神经元网络式错综复杂的连线
- **背景**：深色（纯黑或深蓝），支持粒子/星空效果（后续扩展）
- **节点**：以 label 文字为主 + CSS 发光渲染
- **立体感**：阴影 + 光晕 + 可能的视差效果

---

## 组件结构

```
App.vue
  ├── CWFrameGraph.vue      # D3 渲染主容器（SVG）
  │     ├── D3 力导向布局
  │     ├── 节点渲染（v-for）
  │     │     └── CWFrameNode.vue
  │     │           └── CWFrameLabel.vue  # 预留扩展接口
  │     └── 连线渲染（依赖关系）
  │           └── 神经元风格曲线
  │
  └── 输入区域
        └── 搜索框（输入词汇匹配）
```

---

## 节点状态视觉

| 状态 | 节点 | label | 连线 |
|------|------|-------|------|
| **Unlocked** | 亮发光（filter: glow） | 完全显示 | 亮色实线 |
| **Discoverable** | 微光（低透明度） | 模糊/半透明 | 弱光虚线 |
| **Locked** | 完全隐藏（opacity: 0） | 不可见 | 不可见 |

---

## 技术选型

### 渲染库：D3.js v7

- **d3-force**：力导向布局
- **d3-zoom**：缩放 + 拖拽
- **d3-selection**：DOM 操作

### 布局算法

```typescript
// 力导向布局配置
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).id(d => d.id).distance(100))
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(50))
```

---

## 接口设计

### CWFrameNode.vue

```vue
<script setup lang="ts">
interface Props {
  node: CWFrameNode;
  status: 'Unlocked' | 'Discoverable' | 'Locked';
  x: number;
  y: number;
}

interface Emits {
  (e: 'click', nodeId: number): void;
}
</script>

<template>
  <g :transform="`translate(${x}, ${y})`">
    <!-- 发光效果容器 -->
    <g :class="['node', status.toLowerCase()]" @click="$emit('click', node.id)">
      <!-- 节点本体（文字 label） -->
      <text class="node-label">{{ node.label }}</text>
    </g>
  </g>
</template>
```

### CWFrameLabel.vue（预留扩展）

```vue
<!-- 当前 MVP 简化版本 -->
<template>
  <div class="label-popup">
    <h3>{{ node.label }}</h3>
    <p>{{ node.description }}</p>
  </div>
</template>
```

### CWFrameGraph.vue

```vue
<script setup lang="ts">
import * as d3 from 'd3';
import { ref, watch, onMounted } from 'vue';
import type { CWFrameMap, CWFrameProgress } from '@shared/contract';
import { buildStatusMap } from '../core/cwframe.status';
import CWFrameNode from './CWFrameNode.vue';

interface Props {
  frameMap: CWFrameMap;
  progress: CWFrameProgress;
}

const props = defineProps<Props>();
const svgRef = ref<SVGSVGElement | null>(null);

// 实时计算状态
const statusMap = computed(() => buildStatusMap(props.frameMap, props.progress));

// D3 布局数据
const layoutData = ref<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });

// 初始化布局
function initLayout() {
  const nodes = props.frameMap.map(n => ({ ...n }));
  const links = props.frameMap.nodes.flatMap(n => 
    n.dependencies.map(depId => ({ source: depId, target: n.id }))
  );

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(120))
    .force('charge', d3.forceManyBody().strength(-400))
    .force('center', d3.forceCenter(600, 400))
    .force('collision', d3.forceCollide().radius(60));

  simulation.on('tick', () => {
    layoutData.value = { nodes, links };
  });
}

// 缩放行为
const zoom = d3.zoom<SVGSVGElement, unknown>()
  .scaleExtent([0.2, 3])
  .on('zoom', (event) => {
    containerRef.value?.setAttribute('transform', event.transform);
  });

onMounted(() => {
  initLayout();
  d3.select(svgRef.value).call(zoom);
});
</script>

<template>
  <div class="graph-container">
    <svg ref="svgRef">
      <g ref="containerRef">
        <!-- 连线 -->
        <g class="links">
          <line
            v-for="(link, i) in layoutData.links"
            :key="`link-${i}`"
            :x1="link.source.x"
            :y1="link.source.y"
            :x2="link.target.x"
            :y2="link.target.y"
            :class="getLinkClass(link.source.id, link.target.id)"
          />
        </g>

        <!-- 节点 -->
        <CWFrameNode
          v-for="node in layoutData.nodes"
          :key="node.id"
          :node="node"
          :status="statusMap[node.id] || 'Locked'"
          :x="node.x"
          :y="node.y"
          @click="handleNodeClick"
        />
      </g>
    </svg>
  </div>
</template>
```

---

## 样式设计

### 全局样式（style.css）

```css
:root {
  --color-unlocked: #4fc3f7;
  --color-discoverable: #546e7a;
  --color-locked: transparent;
  --glow-unlocked: 0 0 20px #4fc3f7, 0 0 40px #4fc3f7;
}

.graph-container {
  width: 100%;
  height: 100vh;
  background: #0a0a0f;
  overflow: hidden;
}

.node.unlocked text {
  fill: var(--color-unlocked);
  filter: drop-shadow(var(--glow-unlocked));
}

.node.discoverable text {
  fill: var(--color-discoverable);
  opacity: 0.5;
  filter: blur(2px);
}

.node-locked {
  opacity: 0;
}

.link-unlocked {
  stroke: var(--color-unlocked);
  stroke-opacity: 0.6;
}

.link-discoverable {
  stroke: var(--color-discoverable);
  stroke-opacity: 0.2;
  stroke-dasharray: 5, 5;
}
```

---

## 交互流程

```
1. 用户进入页面
   ↓
2. 加载 CWFrameMap + CWFrameProgress
   ↓
3. D3 力导向布局初始化
   ↓
4. 初始状态：所有节点 Locked（不可见）
   ↓
5. 用户在输入框输入词汇（如 "CPU"）
   ↓
6. 点击确认/按回车
   ↓
7. 匹配逻辑：精确匹配 node.label（不区分大小写）
   ↓
8. 匹配成功：
   - 更新 progress.unlockedNodes
   - 重新计算 statusMap
   - D3 实时更新：节点变为 Unlocked 状态
   ↓
9. Discoverable 逻辑：
   - 当依赖节点被解锁后，相关节点自动变为 Discoverable
   - 显示弱光 + 模糊 label，提示用户可探索
```

---

## 文件清单

```
frontend/src/
├── components/
│     ├── CWFrameGraph.vue      # D3 渲染主容器
│     ├── CWFrameNode.vue       # 节点组件
│     └── CWFrameLabel.vue      # 预留：节点详情弹窗
├── core/
│     ├── cwframe.loader.ts     # 已存在
│     ├── cwframe.status.ts    # 已存在
│     └── cwframe.progress.ts  # 已存在
├── data/
│     ├── world-data.json       # 已存在
│     └── mock-progress.ts      # 已存在
├── App.vue                     # 集成组件 + 输入框
└── style.css                   # 全局样式
```

---

## MVP 验收标准

- [ ] D3 力导向布局正确渲染节点和连线
- [ ] 缩放/拖拽功能正常
- [ ] 输入框输入 label 精确匹配后，节点实时点亮
- [ ] 依赖关系满足后，Discoverable 节点弱化显示
- [ ] Locked 节点完全隐藏
- [ ] 连线根据状态显示不同样式
- [ ] 整体科幻/神经元风格视觉

---

## 后续优化方向

- [ ] 银河粒子背景
- [ ] 节点点击显示 CWFrameLabel.vue 详情
- [ ] 模糊匹配（语义相似词）
- [ ] 节点分类颜色区分（硬件/OS/编程语言等）
- [ ] 动画过渡优化
- [ ] 性能优化（大数据量）

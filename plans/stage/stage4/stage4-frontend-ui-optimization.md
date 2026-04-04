# Stage 4: 前端 UI 优化

## 目标
实现迷雾探索机制、节点权重可视化、缩放交互、大规模节点性能优化。

---

## 一、核心功能设计

### 1.1 迷雾探索机制

**视觉效果：**
- **初始状态**：Graph 区域全黑，所有节点隐藏
- **点亮节点后**：
  - 节点完全显示（高亮、可交互）
  - 连线半亮（50% 透明度，渐变效果）
  - 相邻未点亮节点保持隐藏（仅显示模糊轮廓）

**实现原理：**
```typescript
// 节点状态
enum NodeState {
  HIDDEN = 'hidden',       // 完全隐藏
  OUTLINED = 'outlined',   // 轮廓可见（相邻已点亮节点）
  UNLOCKED = 'unlocked'    // 已点亮
}

// 连线状态
enum EdgeState {
  HIDDEN = 'hidden',       // 完全隐藏
  HALF_LIT = 'half-lit',   // 半亮（一端点亮）
  FULL_LIT = 'full-lit'    // 全亮（两端都点亮）
}
```

### 1.2 节点权重可视化

**节点大小映射：**
```typescript
// weight: 1-10
// size: 20px - 80px
function getNodeSize(weight: number): number {
  return 20 + (weight - 1) * 6.67; // 线性映射
}
```

**LOD（Level of Detail）：**
```typescript
// 根据缩放级别显示不同权重的节点
function shouldShowNode(weight: number, zoomLevel: number): boolean {
  if (zoomLevel < 0.5) return weight >= 8;      // 缩小：只显示核心节点
  if (zoomLevel < 1.0) return weight >= 5;      // 中等：显示重要节点
  return true;                                   // 放大：显示所有节点
}
```

---

## 二、技术方案选择

### 2.1 方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| @vue-flow | Vue 3 原生、易上手 | 性能一般（<500节点） | 快速原型 |
| Cytoscape.js | 性能强、功能丰富 | 学习曲线陡 | 大规模图谱 |
| D3.js + Canvas | 完全自定义、性能好 | 开发成本高 | 特殊需求 |

**推荐方案：**
- **阶段 1**：先用 @vue-flow 实现核心功能
- **阶段 2**：如果性能不足，迁移到 Cytoscape.js

---

## 三、实现步骤

### 3.1 数据准备

#### 更新节点数据

更新 `backend/src/data/map.default.json`，添加 weight 和 tier：

```json
{
  "version": "0.2",
  "nodes": [
    {
      "id": 1,
      "label": "计算机系统",
      "description": "计算机系统概述",
      "category": "基础",
      "dependencies": [],
      "weight": 10,
      "tier": 1
    },
    {
      "id": 2,
      "label": "CPU",
      "description": "中央处理器",
      "category": "硬件",
      "dependencies": [1],
      "weight": 9,
      "tier": 2
    }
  ]
}
```

#### 更新类型定义

确保 `shared/contract.ts` 包含：

```typescript
export interface CWFrameNode {
  id: number;
  label: string;
  description: string;
  category: string;
  dependencies: number[];
  weight: number;    // 1-10
  tier?: number;     // 层级
}
```

---

## 四、前端实现

### 4.1 创建节点状态管理

创建 `frontend/src/core/cwframe.visibility.ts`：

```typescript
import type { CWFrameNode, CWFrameProgress } from '@shared/contract';

export enum NodeVisibility {
  HIDDEN = 'hidden',
  OUTLINED = 'outlined',
  UNLOCKED = 'unlocked'
}

export enum EdgeVisibility {
  HIDDEN = 'hidden',
  HALF_LIT = 'half-lit',
  FULL_LIT = 'full-lit'
}

/**
 * 计算节点可见性
 */
export function getNodeVisibility(
  node: CWFrameNode,
  progress: CWFrameProgress,
  allNodes: CWFrameNode[]
): NodeVisibility {
  // 已解锁
  if (progress.unlockedNodes[node.id]) {
    return NodeVisibility.UNLOCKED;
  }
  
  // 检查是否有相邻节点已解锁
  const hasUnlockedNeighbor = allNodes.some(n => {
    const isNeighbor = 
      n.dependencies.includes(node.id) || 
      node.dependencies.includes(n.id);
    return isNeighbor && progress.unlockedNodes[n.id];
  });
  
  if (hasUnlockedNeighbor) {
    return NodeVisibility.OUTLINED;
  }
  
  return NodeVisibility.HIDDEN;
}

/**
 * 计算连线可见性
 */
export function getEdgeVisibility(
  fromNodeId: number,
  toNodeId: number,
  progress: CWFrameProgress
): EdgeVisibility {
  const fromUnlocked = !!progress.unlockedNodes[fromNodeId];
  const toUnlocked = !!progress.unlockedNodes[toNodeId];
  
  if (fromUnlocked && toUnlocked) {
    return EdgeVisibility.FULL_LIT;
  }
  
  if (fromUnlocked || toUnlocked) {
    return EdgeVisibility.HALF_LIT;
  }
  
  return EdgeVisibility.HIDDEN;
}

/**
 * 根据权重计算节点大小
 */
export function getNodeSize(weight: number): number {
  return 20 + (weight - 1) * 6.67;
}

/**
 * 根据缩放级别判断是否显示节点
 */
export function shouldShowNode(weight: number, zoomLevel: number): boolean {
  if (zoomLevel < 0.5) return weight >= 8;
  if (zoomLevel < 1.0) return weight >= 5;
  return true;
}
```

### 4.2 更新 CWFrameGraph 组件

更新 `frontend/src/components/CWFrameGraph.vue`：

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import type { CWFrameNode } from '@shared/contract';
import { useProgressStore } from '../store/progress.store';
import { useMapStore } from '../store/map.store';
import {
  getNodeVisibility,
  getEdgeVisibility,
  getNodeSize,
  shouldShowNode,
  NodeVisibility,
  EdgeVisibility
} from '../core/cwframe.visibility';

const progressStore = useProgressStore();
const mapStore = useMapStore();
const { zoomLevel } = useVueFlow();

// 计算可见节点
const visibleNodes = computed(() => {
  return mapStore.nodes
    .map(node => {
      const visibility = getNodeVisibility(
        node,
        progressStore.progress,
        mapStore.nodes
      );
      
      // LOD 过滤
      if (!shouldShowNode(node.weight, zoomLevel.value)) {
        return null;
      }
      
      return {
        id: String(node.id),
        type: 'custom',
        position: { x: 0, y: 0 }, // 使用布局算法计算
        data: {
          node,
          visibility,
          size: getNodeSize(node.weight)
        }
      };
    })
    .filter(Boolean);
});

// 计算可见连线
const visibleEdges = computed(() => {
  const edges = [];
  
  for (const node of mapStore.nodes) {
    for (const depId of node.dependencies) {
      const visibility = getEdgeVisibility(
        depId,
        node.id,
        progressStore.progress
      );
      
      if (visibility === EdgeVisibility.HIDDEN) continue;
      
      edges.push({
        id: `${depId}-${node.id}`,
        source: String(depId),
        target: String(node.id),
        type: 'custom',
        data: { visibility }
      });
    }
  }
  
  return edges;
});
</script>

<template>
  <div class="cwframe-graph">
    <VueFlow
      :nodes="visibleNodes"
      :edges="visibleEdges"
      :default-zoom="1"
      :min-zoom="0.1"
      :max-zoom="4"
    >
      <Background pattern-color="#1a1a1a" :gap="16" />
      <Controls />
    </VueFlow>
  </div>
</template>

<style scoped>
.cwframe-graph {
  width: 100%;
  height: 100%;
  background: #000;
}
</style>
```

---

## 五、自定义节点组件

创建 `frontend/src/components/CustomNode.vue`：

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { Handle, Position } from '@vue-flow/core';
import { NodeVisibility } from '../core/cwframe.visibility';

const props = defineProps<{
  data: {
    node: any;
    visibility: NodeVisibility;
    size: number;
  };
}>();

const nodeStyle = computed(() => {
  const { visibility, size } = props.data;
  
  const baseStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${size / 4}px`,
    transition: 'all 0.3s ease'
  };
  
  switch (visibility) {
    case NodeVisibility.UNLOCKED:
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 0 20px rgba(102, 126, 234, 0.6)',
        opacity: 1,
        cursor: 'pointer'
      };
    
    case NodeVisibility.OUTLINED:
      return {
        ...baseStyle,
        background: 'transparent',
        border: '2px dashed rgba(255, 255, 255, 0.3)',
        opacity: 0.5,
        cursor: 'not-allowed'
      };
    
    case NodeVisibility.HIDDEN:
    default:
      return {
        ...baseStyle,
        opacity: 0,
        pointerEvents: 'none'
      };
  }
});
</script>

<template>
  <div :style="nodeStyle">
    <Handle type="target" :position="Position.Top" />
    <span v-if="data.visibility === NodeVisibility.UNLOCKED">
      {{ data.node.label }}
    </span>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>
```

---

## 六、自定义连线组件

创建 `frontend/src/components/CustomEdge.vue`：

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { EdgeVisibility } from '../core/cwframe.visibility';

const props = defineProps<{
  data: {
    visibility: EdgeVisibility;
  };
}>();

const edgeStyle = computed(() => {
  switch (props.data.visibility) {
    case EdgeVisibility.FULL_LIT:
      return {
        stroke: '#667eea',
        strokeWidth: 2,
        opacity: 1
      };
    
    case EdgeVisibility.HALF_LIT:
      return {
        stroke: '#667eea',
        strokeWidth: 2,
        opacity: 0.5,
        strokeDasharray: '5,5'
      };
    
    case EdgeVisibility.HIDDEN:
    default:
      return {
        opacity: 0
      };
  }
});
</script>

<template>
  <g>
    <path
      :d="path"
      :style="edgeStyle"
      fill="none"
    />
  </g>
</template>
```

---

## 七、点亮动画

创建 `frontend/src/core/cwframe.animation.ts`：

```typescript
/**
 * 节点点亮动画
 */
export function animateNodeUnlock(nodeElement: HTMLElement): void {
  // 添加动画类
  nodeElement.classList.add('unlock-animation');
  
  // 动画结束后移除类
  setTimeout(() => {
    nodeElement.classList.remove('unlock-animation');
  }, 600);
}
```

添加 CSS 动画：

```css
/* frontend/src/style.css */
@keyframes unlock-pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7);
  }
  50% {
    transform: scale(1.2);
    box-shadow: 0 0 20px 10px rgba(102, 126, 234, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 20px rgba(102, 126, 234, 0.6);
  }
}

.unlock-animation {
  animation: unlock-pulse 0.6s ease-out;
}
```

---

## 八、性能优化

### 8.1 虚拟化渲染

```typescript
// 只渲染视口内的节点
function getVisibleNodesInViewport(
  nodes: CWFrameNode[],
  viewport: { x: number; y: number; width: number; height: number }
): CWFrameNode[] {
  return nodes.filter(node => {
    // 检查节点是否在视口内
    return isInViewport(node.position, viewport);
  });
}
```

### 8.2 节点聚类

```typescript
// 缩小时将相近节点聚类显示
function clusterNodes(
  nodes: CWFrameNode[],
  zoomLevel: number
): CWFrameNode[] {
  if (zoomLevel > 0.5) return nodes;
  
  // 实现聚类算法
  // ...
}
```

---

## 九、任务清单

- [ ] 更新节点数据（添加 weight 和 tier）
- [ ] 创建可见性管理模块
- [ ] 更新 CWFrameGraph 组件
- [ ] 创建自定义节点组件
- [ ] 创建自定义连线组件
- [ ] 实现点亮动画
- [ ] 实现 LOD 系统
- [ ] 性能优化（虚拟化渲染）
- [ ] 测试大规模节点（1000+）

---

## 十、下一步优化

- 添加节点搜索高亮
- 实现学习路径推荐
- 添加进度可视化图表
- 移动端适配

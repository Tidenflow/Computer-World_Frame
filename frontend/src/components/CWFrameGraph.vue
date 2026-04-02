<script setup lang="ts">
import { computed } from 'vue';
import { useMapStore } from '../store/map.store';

const mapStore = useMapStore();

// 精确复刻 React 版色彩系统 (oklch 转换)
const categoryColors: Record<string, string> = {
  'fundamentals': '#60a5fa', // Blue (Fundamentals)
  'hardware': '#38bdf8',     // Sky (Hardware)
  'os': '#a855f7',           // Purple (OS)
  'network': '#0ea5e9',      // Cyan (Network)
  'programming': '#22c55e',  // Green (Programming)
  'data': '#f59e0b',         // Amber (Data)
  'application': '#f43f5e',  // Rose (App)
  'default': '#94a3b8'
};

/**
 * 根据节点分类返回对应的主题色。
 *
 * @param cat - 节点分类（来自 `CWFrameNode.category`）
 * @returns 十六进制颜色字符串（若未知分类则返回 default）
 */
const getCategoryColor = (cat: string): string => categoryColors[cat] || categoryColors.default;

const statusMap = computed(() => mapStore.statusMap);

/**
 * 把地图节点扩展为带坐标的节点（用于 SVG 渲染）。
 *
 * 坐标体系：
 * - 使用固定 `viewBox="0 0 1200 840"`
 * - 横向按“依赖深度”分层
 * - 纵向按同层节点数量进行居中分布
 *
 * @returns 节点数组；若地图未加载返回空数组
 */
const nodesWithPositions = computed(() => {
  if (!mapStore.frameMap) return [];
  
  const nodes = mapStore.frameMap.nodes;
  const paddingX = 150;
  const vWidth = 1200;
  const vHeight = 840;
  
  // 层级计算
  const depthMap: Record<number, number> = {};
  /**
   * 递归计算节点“依赖深度”（用于决定横向分层）。
   *
   * - 若存在循环依赖：使用 `path` 集合阻断，循环链返回深度 0
   * - 若节点无依赖：返回深度 0
   *
   * @param id - 要计算深度的节点 id
   * @param path - 当前递归路径，用于检测循环
   * @returns 依赖深度（非负整数）
   */
  const resolveDepth = (id: number, path = new Set()): number => {
    if (depthMap[id] !== undefined) return depthMap[id];
    if (path.has(id)) return 0;
    
    path.add(id);
    const node = nodes.find(n => n.id === id);
    if (!node || !node.dependencies.length) return 0;
    
    const depth = 1 + Math.max(...node.dependencies.map(d => resolveDepth(d, path)));
    depthMap[id] = depth;
    return depth;
  };

  nodes.forEach(n => resolveDepth(n.id));
  
  const maxDepth = Math.max(...Object.values(depthMap), 0) || 1;
  const buckets: Record<number, number[]> = {};
  nodes.forEach(n => {
    const d = depthMap[n.id] || 0;
    if (!buckets[d]) buckets[d] = [];
    buckets[d].push(n.id);
  });

  return nodes.map(node => {
    const depth = depthMap[node.id] || 0;
    const bucket = buckets[depth];
    const index = bucket.indexOf(node.id);
    const count = bucket.length;
    
    // 复刻 React 的布局感
    const x = paddingX + (depth / maxDepth) * (vWidth - 2 * paddingX);
    // 垂直方向根据数量居中
    const y = (vHeight / 2) + (index - (count - 1) / 2) * 160 + (depth % 2 === 0 ? 0 : 40);
    
    return { ...node, x, y };
  });
});

/**
 * 根据带坐标的节点生成连线列表（用于 SVG `<line>` 渲染）。
 *
 * 高亮逻辑：
 * - 当起点与终点都处于 `Unlocked` 时，`isUnlocked=true`，从而让线条样式更亮
 *
 * @returns 连线数组，元素包含：x1/y1/x2/y2/isUnlocked
 */
const links = computed(() => {
  const nodes = nodesWithPositions.value;
  return nodes.flatMap(node => 
    node.dependencies.map(depId => {
      const source = nodes.find(n => n.id === depId);
      if (source) {
        // 高亮逻辑: 仅当起点和终点都解锁时高亮
        const isUnlocked = statusMap.value[node.id] === 'Unlocked' && statusMap.value[source.id] === 'Unlocked';
        return { x1: source.x, y1: source.y, x2: node.x, y2: node.y, isUnlocked };
      }
      return null;
    }).filter(v => v !== null)
  );
});

/**
 * 处理节点点击：
 * - 允许打开 `Unlocked` 与 `Discoverable` 节点的详情
 * - `Locked` 节点点击无效果（避免“不可探索”误导）
 *
 * @param nodeId - 被点击的节点 id
 * @returns void
 */
function handleNodeClick(nodeId: number): void {
  // 逻辑调整：允许查看 Unlocked 和 Discoverable 节点的详情
  const status = statusMap.value[nodeId];
  if (status === 'Unlocked' || status === 'Discoverable') {
    mapStore.selectNode(nodeId);
  }
}
</script>

<template>
  <div class="graph-2d-host">
    <!-- SVG 背景网格与图谱 -->
    <svg 
      class="graph-canvas" 
      viewBox="0 0 1200 840" 
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id="dotGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.06)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dotGrid)" />

      <!-- 连线层 -->
      <g class="layer-links">
        <line
          v-for="(link, i) in links"
          :key="i"
          :x1="link.x1" :y1="link.y1"
          :x2="link.x2" :y2="link.y2"
          :class="{ active: link.isUnlocked }"
          class="link-line"
        />
      </g>

      <!-- 节点层 -->
      <g class="layer-nodes">
        <g 
          v-for="node in nodesWithPositions" 
          :key="node.id"
          class="node-unit"
          :class="[statusMap[node.id]?.toLowerCase(), { selected: mapStore.selectedNodeId === node.id }]"
          @click="handleNodeClick(node.id)"
        >
          <!-- 呼吸 Halo (仅解锁状态) -->
          <circle 
            v-if="statusMap[node.id] === 'Unlocked'"
            :cx="node.x" :cy="node.y" r="35"
            :fill="getCategoryColor(node.category)"
            class="breathe-halo"
          />

          <!-- 节点主体 -->
          <circle 
            :cx="node.x" :cy="node.y" r="25"
            :fill="statusMap[node.id] === 'Unlocked' ? getCategoryColor(node.category) : '#1e293b'"
            :stroke="statusMap[node.id] === 'Unlocked' ? getCategoryColor(node.category) : '#334155'"
            stroke-width="2"
            class="main-circle"
          />

          <!-- 装饰小标 -->
          <circle 
            :cx="node.x + 15" :cy="node.y - 15" r="4.5"
            :fill="getCategoryColor(node.category)"
            class="cat-dot"
          />

          <!-- 节点文字 -->
          <text 
            :x="node.x" :y="node.y + 50" 
            text-anchor="middle"
            class="node-label"
            :fill="statusMap[node.id] === 'Unlocked' ? '#f8fafc' : '#64748b'"
          >
            {{ node.label }}
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.graph-2d-host {
  width: 100%;
  height: 100%;
  background: #020617;
  position: relative;
}

.graph-canvas {
  width: 100%;
  height: 100%;
}

.link-line {
  stroke: rgba(255, 255, 255, 0.04);
  stroke-width: 1.5;
  transition: all 0.4s ease;
}

.link-line.active {
  stroke: var(--blue-400);
  stroke-width: 2.5;
  opacity: 0.6;
}

.node-unit {
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  transform-box: fill-box;
  transform-origin: center;
}

.node-unit:hover { transform: scale(1.15); filter: brightness(1.2); }
.node-unit.selected { transform: scale(1.1); }

.node-label {
  font-size: 11px;
  font-weight: 800;
  pointer-events: none;
  user-select: none;
  letter-spacing: 0.05em;
}

.breathe-halo {
  animation: svg-breathe 2.5s infinite ease-in-out;
  transform-box: fill-box;
  transform-origin: center;
}

@keyframes svg-breathe {
  0%, 100% { transform: scale(1); opacity: 0.15; }
  50% { transform: scale(1.18); opacity: 0.35; }
}

.cat-dot {
  stroke: #020617;
  stroke-width: 1.5;
}

/* 状态样式 */
.unlocked { opacity: 1; }
.discoverable { opacity: 0.6; }
.locked { opacity: 0.2; cursor: not-allowed; }
</style>

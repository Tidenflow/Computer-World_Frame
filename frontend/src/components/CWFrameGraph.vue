<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { layoutGraphTree } from '../core/cwframe.layout';
import { useMapStore } from '../store/map.store';
import { useProgressStore } from '../store/progress.store';

const VIEWBOX_WIDTH = 1200;
const VIEWBOX_HEIGHT = 840;
const VIEWBOX_CENTER_X = VIEWBOX_WIDTH / 2;
const VIEWBOX_CENTER_Y = VIEWBOX_HEIGHT / 2;
const MIN_ZOOM = 0.42;
const MAX_ZOOM = 2.1;

const mapStore = useMapStore();
const progressStore = useProgressStore();

const svgRef = ref<SVGSVGElement | null>(null);

const categoryColors: Record<string, string> = {
  fundamentals: '#60a5fa',
  hardware: '#38bdf8',
  os: '#a855f7',
  network: '#0ea5e9',
  programming: '#22c55e',
  data: '#f59e0b',
  application: '#f43f5e',
  default: '#94a3b8'
};
const RECENT_HIGHLIGHT_COLOR = '#facc15';

const viewport = reactive({
  scale: 1,
  translateX: 0,
  translateY: 0
});

const dragState = reactive({
  active: false,
  startClientX: 0,
  startClientY: 0,
  originTranslateX: 0,
  originTranslateY: 0
});

<<<<<<< HEAD
=======
/**
 * 根据节点所属 domain 返回对应的主题色。
 *
 * @param cat - 节点所属 domain
 * @returns 十六进制颜色字符串（若未知分类则返回 default）
 */
>>>>>>> 46e04ac (refactor: consume document-based maps in frontend)
const getCategoryColor = (cat: string): string => categoryColors[cat] || categoryColors.default;
const getDisplayColor = (nodeId: number, category: string): string =>
  recentNodeIds.value.has(nodeId) ? RECENT_HIGHLIGHT_COLOR : getCategoryColor(category);

const visibilityMap = computed(() => mapStore.visibilityMap);
const recentNodeIds = computed(() => new Set(progressStore.recentlyUnlockedIds));
const renderableNodeIds = computed(
  () =>
    new Set(
      Object.entries(visibilityMap.value)
        .filter(([, visibility]) => visibility !== 'Hidden')
        .map(([nodeId]) => Number(nodeId))
    )
);

<<<<<<< HEAD
function getNodeRadius(weight: number): number {
  return 11 + (weight - 1) * 1.15;
}

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function getDensityThreshold(scale: number): number {
  if (scale <= 0.7) return 7;
  if (scale <= 0.85) return 5;
  if (scale <= 1) return 3;
  return 1;
}

const treeLayout = computed(() => {
  if (!mapStore.frameMap) {
    return { instances: [], links: [] };
  }

  return layoutGraphTree(mapStore.frameMap.nodes, {
    activeNodeIds: renderableNodeIds.value,
    width: VIEWBOX_WIDTH,
    height: VIEWBOX_HEIGHT
=======
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

  const nodes = mapStore.frameMap.document.nodes;
  const paddingX = 150;
  const vWidth = 1200;
  const vHeight = 840;

  // 层级计算
  const depthMap: Record<string, number> = {};
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
  const resolveDepth = (id: string, path = new Set<string>()): number => {
    if (depthMap[id] !== undefined) return depthMap[id];
    if (path.has(id)) return 0;

    path.add(id);
    const node = nodes.find(n => n.id === id);
    if (!node || !node.deps.length) return 0;

    const depth = 1 + Math.max(...node.deps.map(d => resolveDepth(d, path)));
    depthMap[id] = depth;
    return depth;
  };

  nodes.forEach(n => resolveDepth(n.id));
  
  const maxDepth = Math.max(...Object.values(depthMap), 0) || 1;
  const buckets: Record<number, string[]> = {};
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
>>>>>>> 46e04ac (refactor: consume document-based maps in frontend)
  });
});

const nodesWithPositions = computed(() =>
  treeLayout.value.instances.map(node => ({
    ...node,
    radius: getNodeRadius(node.weight),
    visibility: visibilityMap.value[node.id] ?? 'Hidden'
  }))
);
const outlinedLabelInstanceKeys = computed(() => {
  const instanceMap = new Map(nodesWithPositions.value.map(node => [node.instanceKey, node]));
  const directOutlinedKeys = new Set<string>();

  for (const link of treeLayout.value.links) {
    const source = instanceMap.get(link.sourceInstanceKey);
    const target = instanceMap.get(link.targetInstanceKey);
    if (!source || !target) continue;

    if (source.visibility === 'Unlocked' && target.visibility === 'Outlined') {
      directOutlinedKeys.add(target.instanceKey);
    }

    if (target.visibility === 'Unlocked' && source.visibility === 'Outlined') {
      directOutlinedKeys.add(source.instanceKey);
    }
  }

  return directOutlinedKeys;
});

const visibleNodes = computed(() => {
  const minWeight = getDensityThreshold(viewport.scale);

  return nodesWithPositions.value.filter(node => {
    if (node.visibility === 'Hidden') return false;

    if (node.visibility === 'Outlined') {
      return true;
    }

    return node.weight >= minWeight || viewport.scale >= 1.02 || recentNodeIds.value.has(node.id);
  });
});

const visibleInstanceKeys = computed(
  () => new Set(visibleNodes.value.map(node => node.instanceKey))
);

const links = computed(() => {
<<<<<<< HEAD
  const instanceMap = new Map(nodesWithPositions.value.map(node => [node.instanceKey, node]));

  return treeLayout.value.links
    .map(link => {
      const source = instanceMap.get(link.sourceInstanceKey);
      const target = instanceMap.get(link.targetInstanceKey);
      if (!source || !target) return null;
      if (
        !visibleInstanceKeys.value.has(source.instanceKey) ||
        !visibleInstanceKeys.value.has(target.instanceKey)
      ) {
        return null;
=======
  const nodes = nodesWithPositions.value;
  return nodes.flatMap(node =>
    node.deps.map(depId => {
      const source = nodes.find(n => n.id === depId);
      if (source) {
        // 高亮逻辑: 仅当起点和终点都解锁时高亮
        const isUnlocked = statusMap.value[node.id] === 'Unlocked' && statusMap.value[source.id] === 'Unlocked';
        return { x1: source.x, y1: source.y, x2: node.x, y2: node.y, isUnlocked };
>>>>>>> 46e04ac (refactor: consume document-based maps in frontend)
      }

      const variant =
        source.visibility === 'Unlocked' && target.visibility === 'Unlocked'
          ? 'full'
          : 'partial';

      return {
        key: link.key,
        path: buildLinkPath(source.x, source.y, target.x, target.y),
        variant
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);
});

<<<<<<< HEAD
const graphTransform = computed(
  () => `translate(${viewport.translateX} ${viewport.translateY}) scale(${viewport.scale})`
);

function getSvgPoint(clientX: number, clientY: number): { x: number; y: number } {
  const svg = svgRef.value;
  if (!svg) return { x: 0, y: 0 };

  const rect = svg.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * VIEWBOX_WIDTH,
    y: ((clientY - rect.top) / rect.height) * VIEWBOX_HEIGHT
  };
}

function handlePointerDown(event: PointerEvent): void {
  dragState.active = true;
  dragState.startClientX = event.clientX;
  dragState.startClientY = event.clientY;
  dragState.originTranslateX = viewport.translateX;
  dragState.originTranslateY = viewport.translateY;
}

function handlePointerMove(event: PointerEvent): void {
  if (!dragState.active || !svgRef.value) return;

  const rect = svgRef.value.getBoundingClientRect();
  const deltaX = ((event.clientX - dragState.startClientX) / rect.width) * VIEWBOX_WIDTH;
  const deltaY = ((event.clientY - dragState.startClientY) / rect.height) * VIEWBOX_HEIGHT;

  viewport.translateX = dragState.originTranslateX + deltaX;
  viewport.translateY = dragState.originTranslateY + deltaY;
}

function handlePointerUp(): void {
  dragState.active = false;
}

function handleWheel(event: WheelEvent): void {
  event.preventDefault();

  const pointer = getSvgPoint(event.clientX, event.clientY);
  const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
  const nextScale = clampZoom(viewport.scale * zoomFactor);
  const worldX = (pointer.x - viewport.translateX) / viewport.scale;
  const worldY = (pointer.y - viewport.translateY) / viewport.scale;

  viewport.scale = nextScale;
  viewport.translateX = pointer.x - worldX * nextScale;
  viewport.translateY = pointer.y - worldY * nextScale;
}

function buildLinkPath(x1: number, y1: number, x2: number, y2: number): string {
  const deltaX = x2 - x1;
  const controlOffsetX = Math.max(Math.abs(deltaX) * 0.45, 40);
  const controlX1 = x1 + controlOffsetX;
  const controlX2 = x2 - controlOffsetX;

  return `M ${x1} ${y1} C ${controlX1} ${y1}, ${controlX2} ${y2}, ${x2} ${y2}`;
}

function getDensityAdjustment(densityScore: number): number {
  if (densityScore <= 2) return 0.12;
  if (densityScore <= 5) return 0.04;
  if (densityScore <= 8) return 0;
  if (densityScore <= 12) return -0.08;
  return -0.14;
}

function getWeightAdjustment(weight: number): number {
  if (weight >= 8) return -0.05;
  if (weight <= 3) return 0.03;
  return 0;
}

function computeFocusZoom(nodeId: number): number {
  if (!mapStore.frameMap) return 1;

  const targetNode = mapStore.frameMap.nodes.find(node => node.id === nodeId);
  if (!targetNode) return 1;

  const adjacentIds = new Set<number>(targetNode.dependencies);
  for (const node of mapStore.frameMap.nodes) {
    if (node.dependencies.includes(nodeId)) adjacentIds.add(node.id);
  }

  let unlockedNeighbors = 0;
  let outlinedNeighbors = 0;
  let visibleEdges = 0;

  for (const adjacentId of adjacentIds) {
    const visibility = visibilityMap.value[adjacentId];
    if (visibility === 'Unlocked') unlockedNeighbors += 1;
    if (visibility === 'Outlined') outlinedNeighbors += 1;
    if (visibility && visibility !== 'Hidden') visibleEdges += 1;
  }

  const densityScore =
    unlockedNeighbors * 1.0 +
    outlinedNeighbors * 0.45 +
    visibleEdges * 0.25;

  return clampZoom(
    1.0 + getDensityAdjustment(densityScore) + getWeightAdjustment(targetNode.weight)
  );
}

function focusNodeInGraph(nodeId: number): void {
  const targetNode = [...nodesWithPositions.value]
    .filter(node => node.id === nodeId)
    .sort((left, right) => {
      if (left.depth !== right.depth) return left.depth - right.depth;

      const leftDistance =
        Math.abs(left.x - VIEWBOX_CENTER_X) + Math.abs(left.y - VIEWBOX_CENTER_Y);
      const rightDistance =
        Math.abs(right.x - VIEWBOX_CENTER_X) + Math.abs(right.y - VIEWBOX_CENTER_Y);

      return leftDistance - rightDistance;
    })[0];
  if (!targetNode || targetNode.visibility === 'Hidden') return;

  const nextScale = computeFocusZoom(nodeId);
  viewport.scale = nextScale;
  viewport.translateX = VIEWBOX_CENTER_X - targetNode.x * nextScale;
  viewport.translateY = VIEWBOX_CENTER_Y - targetNode.y * nextScale;
}

function handleNodeClick(nodeId: number): void {
  if (visibilityMap.value[nodeId] === 'Unlocked') {
    mapStore.openNode(nodeId);
=======
/**
 * 处理节点点击：
 * - 允许打开 `Unlocked` 与 `Discoverable` 节点的详情
 * - `Locked` 节点点击无效果（避免“不可探索”误导）
 *
 * @param nodeId - 被点击的节点 id
 * @returns void
 */
function handleNodeClick(nodeId: string): void {
  // 逻辑调整：允许查看 Unlocked 和 Discoverable 节点的详情
  const status = statusMap.value[nodeId];
  if (status === 'Unlocked' || status === 'Discoverable') {
    mapStore.selectNode(nodeId);
>>>>>>> 46e04ac (refactor: consume document-based maps in frontend)
  }
}

watch(
  () => mapStore.focusRequest?.requestedAt,
  requestedAt => {
    if (!requestedAt || !mapStore.focusRequest) return;
    focusNodeInGraph(mapStore.focusRequest.nodeId);
  }
);
</script>

<template>
  <div class="graph-2d-host">
    <svg
      ref="svgRef"
      class="graph-canvas"
      viewBox="0 0 1200 840"
      preserveAspectRatio="xMidYMid meet"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointerleave="handlePointerUp"
      @wheel="handleWheel"
    >
      <defs>
        <pattern id="dotGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.05)" />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#dotGrid)" />

<<<<<<< HEAD
      <g class="graph-transform-layer" :transform="graphTransform">
        <g class="layer-links">
          <path
            v-for="link in links"
            :key="link.key"
            :d="link.path"
            :class="['link-line', link.variant]"
            fill="none"
=======
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
            :fill="getCategoryColor(node.domain)"
            class="breathe-halo"
>>>>>>> 46e04ac (refactor: consume document-based maps in frontend)
          />
        </g>

<<<<<<< HEAD
        <g class="layer-nodes">
          <g
            v-for="node in visibleNodes"
            :key="node.instanceKey"
            class="node-unit"
            :class="[
              node.visibility.toLowerCase(),
              {
                selected: mapStore.selectedNodeId === node.id,
                recent: recentNodeIds.has(node.id)
              }
            ]"
            @click.stop="handleNodeClick(node.id)"
          >
            <circle
              v-if="node.visibility === 'Unlocked'"
              :cx="node.x"
              :cy="node.y"
              :r="node.radius + 11"
              :fill="getDisplayColor(node.id, node.category)"
              class="breathe-halo"
            />

            <circle
              v-if="node.visibility === 'Unlocked'"
              :cx="node.x"
              :cy="node.y"
              :r="node.radius"
              :fill="getDisplayColor(node.id, node.category)"
              :stroke="getDisplayColor(node.id, node.category)"
              stroke-width="2"
              class="main-circle"
            />

            <circle
              v-if="node.visibility === 'Outlined'"
              :cx="node.x"
              :cy="node.y"
              :r="Math.max(node.radius - 4, 8)"
              fill="rgba(255,255,255,0.02)"
              stroke="rgba(226, 232, 240, 0.42)"
              stroke-width="1.5"
              class="outline-circle"
            />

            <circle
              v-if="node.visibility === 'Unlocked'"
              :cx="node.x + node.radius * 0.6"
              :cy="node.y - node.radius * 0.6"
              r="4.5"
              :fill="getDisplayColor(node.id, node.category)"
              class="cat-dot"
            />

            <text
              v-if="node.visibility === 'Unlocked' && viewport.scale >= 0.9"
              :x="node.x"
              :y="node.y + node.radius + 26"
              text-anchor="middle"
              class="node-label"
              fill="#f8fafc"
            >
              {{ node.label }}
            </text>

            <text
              v-if="
                node.visibility === 'Outlined' &&
                viewport.scale >= 0.92 &&
                outlinedLabelInstanceKeys.has(node.instanceKey)
              "
              :x="node.x"
              :y="node.y + node.radius + 22"
              text-anchor="middle"
              class="node-label node-label-outlined"
              fill="rgba(226, 232, 240, 0.76)"
            >
              {{ node.label }}
            </text>
          </g>
=======
          <!-- 节点主体 -->
          <circle 
            :cx="node.x" :cy="node.y" r="25"
            :fill="statusMap[node.id] === 'Unlocked' ? getCategoryColor(node.domain) : '#1e293b'"
            :stroke="statusMap[node.id] === 'Unlocked' ? getCategoryColor(node.domain) : '#334155'"
            stroke-width="2"
            class="main-circle"
          />

          <!-- 装饰小标 -->
          <circle 
            :cx="node.x + 15" :cy="node.y - 15" r="4.5"
            :fill="getCategoryColor(node.domain)"
            class="cat-dot"
          />

          <!-- 节点文字 -->
          <text 
            :x="node.x" :y="node.y + 50" 
            text-anchor="middle"
            class="node-label"
            :fill="statusMap[node.id] === 'Unlocked' ? '#f8fafc' : '#64748b'"
          >
            {{ node.title }}
          </text>
>>>>>>> 46e04ac (refactor: consume document-based maps in frontend)
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.graph-2d-host {
  width: 100%;
  height: 100%;
  background:
    radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.35), rgba(2, 6, 23, 0.96) 58%),
    #020617;
  position: relative;
}

.graph-canvas {
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: grab;
}

.graph-canvas:active {
  cursor: grabbing;
}

.graph-transform-layer {
  transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
}

.link-line {
  transition: all 0.35s ease;
}

.link-line.full {
  stroke: rgba(96, 165, 250, 0.45);
  stroke-width: 2.1;
}

.link-line.partial {
  stroke: rgba(148, 163, 184, 0.14);
  stroke-width: 1.2;
}

.node-unit {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  transform-box: fill-box;
  transform-origin: center;
}

.node-unit.unlocked {
  cursor: pointer;
}

.node-unit.unlocked:hover {
  transform: scale(1.08);
  filter: brightness(1.12);
}

.node-unit.outlined {
  cursor: default;
}

.node-unit.selected {
  transform: scale(1.08);
}

.node-label {
  font-size: 11px;
  font-weight: 800;
  pointer-events: none;
  user-select: none;
  letter-spacing: 0.05em;
}

.node-label-outlined {
  font-weight: 700;
}

.breathe-halo {
  animation: svg-breathe 2.5s infinite ease-in-out;
  transform-box: fill-box;
  transform-origin: center;
  opacity: 0.2;
}

@keyframes svg-breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.14;
  }

  50% {
    transform: scale(1.15);
    opacity: 0.3;
  }
}

.main-circle {
  filter: drop-shadow(0 0 14px rgba(96, 165, 250, 0.18));
}

.outline-circle {
  opacity: 0.9;
}

.cat-dot {
  stroke: #020617;
  stroke-width: 1.5;
}
</style>

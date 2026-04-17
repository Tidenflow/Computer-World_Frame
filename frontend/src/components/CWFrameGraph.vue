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
  originTranslateY: 0,
  pointerId: null as number | null
});

const getCategoryColor = (cat: string): string => categoryColors[cat] || categoryColors.default;
const getDisplayColor = (nodeId: string, category: string): string =>
  recentNodeIds.value.has(nodeId) ? RECENT_HIGHLIGHT_COLOR : getCategoryColor(category);

const visibilityMap = computed(() => mapStore.visibilityMap);
const recentNodeIds = computed(() => new Set(progressStore.recentlyUnlockedIds));
const renderableNodeIds = computed(() => {
  if (mapStore.selectedDomains.size === 0) {
    return undefined; // 空过滤条件 = 显示全部
  }
  return new Set(
    Object.entries(visibilityMap.value)
      .map(([nodeId]) => nodeId)
  );
});

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

  return layoutGraphTree(mapStore.frameMap.document.nodes, {
    activeNodeIds: renderableNodeIds.value,
    width: VIEWBOX_WIDTH,
    height: VIEWBOX_HEIGHT
  });
});

const nodesWithPositions = computed(() =>
  treeLayout.value.instances.map(node => ({
    ...node,
    radius: getNodeRadius((node as any).weight ?? 1),
    visibility: visibilityMap.value[node.sourceNodeId] ?? 'Dimmed'
  }))
);
const visibleNodes = computed(() => {
  const minWeight = getDensityThreshold(viewport.scale);

  return nodesWithPositions.value.filter(node => {
    const weight = (node as any).weight ?? 1;
    return weight >= minWeight || viewport.scale >= 1.02 || recentNodeIds.value.has(node.sourceNodeId);
  });
});

const visibleInstanceKeys = computed(
  () => new Set(visibleNodes.value.map(node => node.instanceKey))
);

const links = computed(() => {
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
      }

      const isDirectChild = source.depth === target.depth - 1;
      const opacity = computeLinkOpacity(source.depth, target.depth);

      return {
        key: link.key,
        path: buildOrthogonalPath(source.x, source.y, target.x, target.y),
        opacity,
        isDirectChild
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);
});

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
  event.preventDefault();
  dragState.active = true;
  dragState.pointerId = event.pointerId;
  dragState.startClientX = event.clientX;
  dragState.startClientY = event.clientY;
  dragState.originTranslateX = viewport.translateX;
  dragState.originTranslateY = viewport.translateY;
  svgRef.value?.setPointerCapture(event.pointerId);
}

function handlePointerMove(event: PointerEvent): void {
  if (!dragState.active || !svgRef.value) return;

  const rect = svgRef.value.getBoundingClientRect();
  const deltaX = ((event.clientX - dragState.startClientX) / rect.width) * VIEWBOX_WIDTH;
  const deltaY = ((event.clientY - dragState.startClientY) / rect.height) * VIEWBOX_HEIGHT;

  viewport.translateX = dragState.originTranslateX + deltaX;
  viewport.translateY = dragState.originTranslateY + deltaY;
}

function handlePointerUp(event?: PointerEvent): void {
  const pointerId = event?.pointerId ?? dragState.pointerId;
  if (pointerId !== null && svgRef.value?.hasPointerCapture(pointerId)) {
    svgRef.value.releasePointerCapture(pointerId);
  }

  dragState.active = false;
  dragState.pointerId = null;
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

/**
 * 正交路由边线 (h-v-h 模式)
 * 替代贝塞尔曲线，消除边线交叉问题
 */
function buildOrthogonalPath(x1: number, y1: number, x2: number, y2: number): string {
  const GAP = 30; // 最小拐点距离

  // h-v-h 正交路由：水平 → 拐点 → 垂直 → 拐点 → 水平
  if (Math.abs(x2 - x1) > GAP * 2) {
    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
  }
  // 短边用简单垂直线
  return `M ${x1} ${y1} V ${y2}`;
}

/**
 * 根据缩放级别和边类型计算透明度
 * - 父子边（直接依赖）：高透明度
 * - 跨层边：低透明度
 * - 缩放级别越低，透明度越低
 */
function computeLinkOpacity(sourceDepth: number, targetDepth: number): number {
  const isDirectChild = sourceDepth === targetDepth - 1;

  // 根据缩放级别确定基础透明度
  let baseOpacity: number;
  if (viewport.scale < 0.6) {
    baseOpacity = isDirectChild ? 0.2 : 0.08;
  } else if (viewport.scale < 0.8) {
    baseOpacity = isDirectChild ? 0.3 : 0.12;
  } else if (viewport.scale < 1.0) {
    baseOpacity = isDirectChild ? 0.45 : 0.2;
  } else {
    baseOpacity = isDirectChild ? 0.55 : 0.28;
  }

  return baseOpacity;
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

function computeFocusZoom(nodeId: string): number {
  if (!mapStore.frameMap) return 1;

  const targetNode = mapStore.frameMap.document.nodes.find(node => node.id === nodeId);
  if (!targetNode) return 1;

  const adjacentIds = new Set<string>(targetNode.deps);
  for (const node of mapStore.frameMap.document.nodes) {
    if (node.deps.includes(nodeId)) adjacentIds.add(node.id);
  }

  let unlockedNeighbors = 0;
  let visibleEdges = 0;

  for (const adjacentId of adjacentIds) {
    const visibility = visibilityMap.value[adjacentId];
    if (visibility === 'Unlocked') {
      unlockedNeighbors += 1;
      visibleEdges += 1;
    }
  }

  const densityScore =
    unlockedNeighbors * 1.0 +
    visibleEdges * 0.25;

  const weight = (targetNode as any).weight ?? 1;
  return clampZoom(
    1.0 + getDensityAdjustment(densityScore) + getWeightAdjustment(weight)
  );
}

function focusNodeInGraph(nodeId: string): void {
  const targetNode = [...nodesWithPositions.value]
    .filter(node => node.sourceNodeId === nodeId)
    .sort((left, right) => {
      if (left.depth !== right.depth) return left.depth - right.depth;

      const leftDistance =
        Math.abs(left.x - VIEWBOX_CENTER_X) + Math.abs(left.y - VIEWBOX_CENTER_Y);
      const rightDistance =
        Math.abs(right.x - VIEWBOX_CENTER_X) + Math.abs(right.y - VIEWBOX_CENTER_Y);

      return leftDistance - rightDistance;
    })[0];
  if (!targetNode) return;

  const nextScale = computeFocusZoom(nodeId);
  viewport.scale = nextScale;
  viewport.translateX = VIEWBOX_CENTER_X - targetNode.x * nextScale;
  viewport.translateY = VIEWBOX_CENTER_Y - targetNode.y * nextScale;
}

function handleNodeClick(nodeId: string): void {
  if (visibilityMap.value[nodeId] === 'Unlocked') {
    mapStore.openNode(nodeId);
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
      @pointercancel="handlePointerUp"
      @wheel="handleWheel"
    >
      <defs>
        <pattern id="dotGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.05)" />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#dotGrid)" />

      <g class="graph-transform-layer" :transform="graphTransform">
        <g class="layer-links">
          <path
            v-for="link in links"
            :key="link.key"
            :d="link.path"
            :class="['link-line', link.isDirectChild ? 'direct' : 'indirect']"
            :style="{ opacity: link.opacity }"
            fill="none"
          />
        </g>

        <g class="layer-nodes">
          <g
            v-for="node in visibleNodes"
            :key="node.instanceKey"
            class="node-unit"
            :class="[
              node.visibility.toLowerCase(),
              {
                selected: mapStore.selectedNodeId === node.sourceNodeId,
                recent: recentNodeIds.has(node.sourceNodeId)
              }
            ]"
            @click.stop="handleNodeClick(node.sourceNodeId)"
          >
            <circle
              v-if="node.visibility === 'Unlocked'"
              :cx="node.x"
              :cy="node.y"
              :r="node.radius + 11"
              :fill="getDisplayColor(node.sourceNodeId, node.domain)"
              class="breathe-halo"
            />

            <circle
              v-if="node.visibility === 'Unlocked'"
              :cx="node.x"
              :cy="node.y"
              :r="node.radius"
              :fill="getDisplayColor(node.sourceNodeId, node.domain)"
              :stroke="getDisplayColor(node.sourceNodeId, node.domain)"
              stroke-width="2"
              class="main-circle"
            />

            <circle
              v-if="node.visibility === 'Unlocked'"
              :cx="node.x + node.radius * 0.6"
              :cy="node.y - node.radius * 0.6"
              r="4.5"
              :fill="getDisplayColor(node.sourceNodeId, node.domain)"
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
              {{ node.title }}
            </text>
          </g>
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

.graph-canvas:active .graph-transform-layer {
  transition: none;
}

.link-line {
  transition: opacity 0.35s ease;
  stroke-linecap: round;
}

.link-line.direct {
  stroke: rgba(96, 165, 250, 0.62);
  stroke-width: 2.35;
}

.link-line.indirect {
  stroke: rgba(148, 163, 184, 0.34);
  stroke-width: 1.65;
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

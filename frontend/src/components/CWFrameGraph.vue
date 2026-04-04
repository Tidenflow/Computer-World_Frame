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

      <g class="graph-transform-layer" :transform="graphTransform">
        <g class="layer-links">
          <path
            v-for="link in links"
            :key="link.key"
            :d="link.path"
            :class="['link-line', link.variant]"
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

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useMapStore } from '../store/map.store';
import { useProgressStore } from '../store/progress.store';

const VIEWBOX_WIDTH = 1200;
const VIEWBOX_HEIGHT = 840;
const VIEWBOX_CENTER_X = VIEWBOX_WIDTH / 2;
const VIEWBOX_CENTER_Y = VIEWBOX_HEIGHT / 2;
const MIN_ZOOM = 0.55;
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

const visibilityMap = computed(() => mapStore.visibilityMap);
const recentNodeIds = computed(() => new Set(progressStore.recentlyUnlockedIds));

function getNodeRadius(weight: number): number {
  return 16 + (weight - 1) * 1.6;
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

const nodesWithPositions = computed(() => {
  if (!mapStore.frameMap) return [];

  const nodes = mapStore.frameMap.nodes;
  const paddingX = 150;
  const depthMap: Record<number, number> = {};

  const resolveDepth = (id: number, path = new Set<number>()): number => {
    if (depthMap[id] !== undefined) return depthMap[id];
    if (path.has(id)) return 0;

    path.add(id);
    const node = nodes.find(n => n.id === id);
    if (!node || !node.dependencies.length) return 0;

    const depth = 1 + Math.max(...node.dependencies.map(depId => resolveDepth(depId, path)));
    depthMap[id] = depth;
    return depth;
  };

  nodes.forEach(node => resolveDepth(node.id));

  const maxDepth = Math.max(...Object.values(depthMap), 0) || 1;
  const buckets: Record<number, number[]> = {};

  nodes.forEach(node => {
    const depth = depthMap[node.id] || 0;
    if (!buckets[depth]) buckets[depth] = [];
    buckets[depth].push(node.id);
  });

  return nodes.map(node => {
    const depth = depthMap[node.id] || 0;
    const bucket = buckets[depth];
    const index = bucket.indexOf(node.id);
    const count = bucket.length;
    const x = paddingX + (depth / maxDepth) * (VIEWBOX_WIDTH - 2 * paddingX);
    const y = (VIEWBOX_HEIGHT / 2) + (index - (count - 1) / 2) * 160 + (depth % 2 === 0 ? 0 : 40);

    return {
      ...node,
      x,
      y,
      radius: getNodeRadius(node.weight),
      visibility: visibilityMap.value[node.id] ?? 'Hidden'
    };
  });
});

const visibleNodes = computed(() => {
  const minWeight = getDensityThreshold(viewport.scale);

  return nodesWithPositions.value.filter(node => {
    if (node.visibility === 'Hidden') return false;

    if (node.visibility === 'Outlined') {
      return viewport.scale >= 0.82;
    }

    return node.weight >= minWeight || viewport.scale >= 1.02 || recentNodeIds.value.has(node.id);
  });
});

const visibleNodeIds = computed(() => new Set(visibleNodes.value.map(node => node.id)));

const links = computed(() => {
  const nodeMap = new Map(nodesWithPositions.value.map(node => [node.id, node]));

  return nodesWithPositions.value.flatMap(node =>
    node.dependencies.map(depId => {
      const source = nodeMap.get(depId);
      if (!source) return null;
      if (!visibleNodeIds.value.has(node.id) || !visibleNodeIds.value.has(source.id)) return null;

      const variant =
        source.visibility === 'Unlocked' && node.visibility === 'Unlocked'
          ? 'full'
          : 'partial';

      return {
        key: `${depId}-${node.id}`,
        x1: source.x,
        y1: source.y,
        x2: node.x,
        y2: node.y,
        variant
      };
    }).filter((value): value is NonNullable<typeof value> => value !== null)
  );
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
  const targetNode = nodesWithPositions.value.find(node => node.id === nodeId);
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
          <line
            v-for="link in links"
            :key="link.key"
            :x1="link.x1"
            :y1="link.y1"
            :x2="link.x2"
            :y2="link.y2"
            :class="['link-line', link.variant]"
          />
        </g>

        <g class="layer-nodes">
          <g
            v-for="node in visibleNodes"
            :key="node.id"
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
              :fill="getCategoryColor(node.category)"
              class="breathe-halo"
            />

            <circle
              v-if="node.visibility === 'Unlocked' && recentNodeIds.has(node.id)"
              :cx="node.x"
              :cy="node.y"
              :r="node.radius + 18"
              fill="transparent"
              stroke="rgba(248, 250, 252, 0.85)"
              stroke-width="1.8"
              class="recent-ring"
            />

            <circle
              v-if="node.visibility === 'Unlocked'"
              :cx="node.x"
              :cy="node.y"
              :r="node.radius"
              :fill="getCategoryColor(node.category)"
              :stroke="getCategoryColor(node.category)"
              stroke-width="2"
              class="main-circle"
            />

            <circle
              v-else
              :cx="node.x"
              :cy="node.y"
              :r="node.radius - 3"
              fill="transparent"
              stroke="rgba(148, 163, 184, 0.42)"
              stroke-width="1.6"
              class="outline-circle"
            />

            <circle
              v-if="node.visibility === 'Unlocked'"
              :cx="node.x + node.radius * 0.6"
              :cy="node.y - node.radius * 0.6"
              r="4.5"
              :fill="getCategoryColor(node.category)"
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

.breathe-halo {
  animation: svg-breathe 2.5s infinite ease-in-out;
  transform-box: fill-box;
  transform-origin: center;
  opacity: 0.2;
}

.recent-ring {
  animation: recent-pulse 1.8s infinite ease-in-out;
  opacity: 0.85;
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

@keyframes recent-pulse {
  0%,
  100% {
    opacity: 0.32;
    transform: scale(1);
  }

  50% {
    opacity: 0.9;
    transform: scale(1.06);
  }
}

.main-circle {
  filter: drop-shadow(0 0 14px rgba(96, 165, 250, 0.18));
}

.outline-circle {
  opacity: 0.88;
}

.cat-dot {
  stroke: #020617;
  stroke-width: 1.5;
}
</style>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import Plotly from 'plotly.js-dist-min';
import { useMapStore } from '../store/map.store';
import { useProgressStore } from '../store/progress.store';
import { compute3DPositions, getDefaultCamera, groupByDomain, getDomainCentroid } from '../core/graph3d.layout';
import type { Graph3DNode, GraphLayoutType } from '../types/domain-filter';
import { getDomainColor, getDomainName, DIMMED_COLOR } from '../types/domain-filter';
import {
  RotateCcw,
  Eye,
  Layers,
  Globe,
  Waves,
  Dna,
  CircleDot
} from 'lucide-vue-next';

const mapStore = useMapStore();
const progressStore = useProgressStore();

const containerRef = ref<HTMLElement | null>(null);
const isLoaded = ref(false);
const showLabels = ref(false);
const densityPercent = ref(100);

// 当前布局类型
const layoutType = ref<GraphLayoutType>('original');

// 相机修订版本（用于重置相机）
const cameraRevision = ref(0);

// 稳定的 UI revision
const uiRevision = computed(() => `camera-${layoutType.value}-${cameraRevision.value}`);

// 计算 3D 节点位置
const graphNodes = computed((): Graph3DNode[] => {
  if (!mapStore.frameMap) return [];
  return compute3DPositions(
    mapStore.frameMap.document.nodes,
    mapStore.visibilityMap,
    layoutType.value
  );
});

// 根据选中 domain 过滤节点
const filteredNodes = computed(() => {
  const selectedDomains = mapStore.selectedDomains;
  if (selectedDomains.size === 0) {
    return graphNodes.value;
  }
  return graphNodes.value.filter(node => selectedDomains.has(node.domain));
});

// 构建 Plotly traces
const plotTraces = computed((): any[] => {
  const groups = groupByDomain(filteredNodes.value);
  const selectedDomains = mapStore.selectedDomains;

  const domainsToShow = selectedDomains.size === 0
    ? Array.from(groups.keys())
    : Array.from(selectedDomains).filter(d => groups.has(d));

  return domainsToShow.map(domainId => {
    const domainNodes = groups.get(domainId) ?? [];
    if (domainNodes.length === 0) return null;

    // 采样
    let sampledNodes = domainNodes;
    if (densityPercent.value < 100) {
      const targetCount = Math.ceil((domainNodes.length * densityPercent.value) / 100);
      sampledNodes = domainNodes
        .sort((a, b) => a.id.localeCompare(b.id))
        .filter((_, idx, arr) => {
          const step = arr.length / targetCount;
          return idx % Math.ceil(step) === 0;
        })
        .slice(0, targetCount);
    }

    const isDomainSelected = selectedDomains.size === 0 || selectedDomains.has(domainId);

    return {
      x: sampledNodes.map(n => n.x),
      y: sampledNodes.map(n => n.y),
      z: sampledNodes.map(n => n.z),
      mode: 'markers' as const,
      type: 'scatter3d' as const,
      name: getDomainName(domainId),
      hovertemplate: sampledNodes.map(n => {
        const stageText = `Stage ${n.stage}`;
        const visibilityText = n.visibility === 'Unlocked' ? '✓ Unlocked' :
          n.visibility === 'Outlined' ? '~ Adjacent' : '○ Locked';
        return `<b>${n.title}</b><br>${getDomainName(domainId)} | ${stageText}<br>${visibilityText}<extra></extra>`;
      }),
      hoverlabel: {
        bgcolor: '#1f2937',
        font: { size: 12, color: '#f9fafb' },
        align: 'left' as const,
        namelength: -1
      },
      marker: {
        color: isDomainSelected ? getDomainColor(domainId) : DIMMED_COLOR,
        size: isDomainSelected ? 6 : 4,
        opacity: isDomainSelected ? 0.85 : 0.35,
        line: {
          color: '#374151',
          width: 0.3
        }
      },
      customdata: sampledNodes.map(n => [n.id, domainId])
    };
  }).filter((t): t is any => t !== null);
});

// 场景标注
const sceneAnnotations = computed((): any[] => {
  if (!showLabels.value) return [];
  if (filteredNodes.value.length === 0) return [];

  const groups = groupByDomain(filteredNodes.value);
  const annotations: any[] = [];

  for (const [domainId, nodes] of groups) {
    const centroid = getDomainCentroid(nodes);
    if (!centroid) continue;

    const isSelected = mapStore.selectedDomains.size === 0 || mapStore.selectedDomains.has(domainId);
    if (!isSelected) continue;

    annotations.push({
      x: centroid.x,
      y: centroid.y,
      z: centroid.z,
      text: getDomainName(domainId),
      showarrow: false,
      font: {
        size: 10,
        color: '#f9fafb',
        family: 'Arial, sans-serif'
      },
      bgcolor: 'rgba(18, 25, 38, 0.85)',
      bordercolor: getDomainColor(domainId),
      borderwidth: 1,
      borderpad: 4,
      xanchor: 'center' as const,
      yanchor: 'middle' as const
    });
  }

  return annotations;
});

// 布局配置
const plotLayout = computed((): any => {
  const camera = getDefaultCamera(layoutType.value);

  return {
    showlegend: false,
    hovermode: 'closest' as const,
    hoverlabel: {
      bgcolor: '#1f2937',
      bordercolor: '#374151',
      font: { size: 12, color: '#f9fafb' },
      align: 'left' as const,
      namelength: -1
    },
    scene: {
      bgcolor: '#0a0f1a',
      xaxis: {
        title: '',
        zeroline: false,
        showgrid: true,
        gridcolor: '#1e293b',
        backgroundcolor: '#0a0f1a',
        showticklabels: false
      },
      yaxis: {
        title: '',
        zeroline: false,
        showgrid: true,
        gridcolor: '#1e293b',
        backgroundcolor: '#0a0f1a',
        showticklabels: false
      },
      zaxis: {
        title: '',
        zeroline: false,
        showgrid: true,
        gridcolor: '#1e293b',
        backgroundcolor: '#0a0f1a',
        showticklabels: false
      },
      camera: camera,
      annotations: sceneAnnotations.value,
      aspectmode: 'cube' as const
    },
    paper_bgcolor: '#0a0f1a',
    plot_bgcolor: '#0a0f1a',
    margin: { t: 10, r: 10, b: 10, l: 10 },
    autosize: true,
    uirevision: uiRevision.value
  };
});

// Plotly 配置
const plotConfig: any = {
  displayModeBar: false,
  displaylogo: false,
  responsive: true,
  scrollZoom: true,
  doubleClick: 'reset' as const
};

// 布局类型列表
const layoutTypes: { id: GraphLayoutType; label: string; icon: any }[] = [
  { id: 'original', label: 'Original', icon: Layers },
  { id: 'sphere', label: 'Sphere', icon: Globe },
  { id: 'galaxy', label: 'Galaxy', icon: CircleDot },
  { id: 'wave', label: 'Wave', icon: Waves },
  { id: 'helix', label: 'Helix', icon: Dna },
  { id: 'torus', label: 'Torus', icon: CircleDot }
];

// 切换布局类型
function setLayoutType(type: GraphLayoutType): void {
  if (layoutType.value === type) return;
  layoutType.value = type;
  cameraRevision.value++;
}

// 重置相机
function resetCamera(): void {
  cameraRevision.value++;
  updatePlot();
}

// 更新图表
async function updatePlot(): Promise<void> {
  if (!containerRef.value || !isLoaded.value) return;
  if (plotTraces.value.length === 0) return;

  try {
    await nextTick();

    Plotly.react(
      containerRef.value,
      plotTraces.value,
      plotLayout.value,
      plotConfig
    );
  } catch (err) {
    console.warn('Plotly update failed:', err);
  }
}

// 初始化图表
function initPlot(): void {
  if (!mapStore.frameMap) {
    setTimeout(initPlot, 50);
    return;
  }
  if (!containerRef.value) return;

  Plotly.newPlot(
    containerRef.value,
    plotTraces.value,
    plotLayout.value,
    plotConfig
  ).then(() => {
    isLoaded.value = true;
  });

  const plotElement = containerRef.value as any;
  if (plotElement && typeof plotElement.on === 'function') {
    plotElement.on('plotly_click', (eventData: any) => {
      if (!eventData.points || eventData.points.length === 0) return;
      const point = eventData.points[0];
      if (!point.customdata) return;
      const [nodeId] = point.customdata;
      const node = filteredNodes.value.find(n => n.id === nodeId);
      if (!node) return;
      if (node.visibility === 'Unlocked') {
        mapStore.openNode(nodeId);
      }
    });
  }
}

// 监听键盘
function handleKeyDown(event: KeyboardEvent): void {
  if ((event.key === 'r' || event.key === 'R') && !event.ctrlKey && !event.metaKey && !event.altKey) {
    resetCamera();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  initPlot();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  if (containerRef.value) {
    Plotly.purge(containerRef.value);
  }
});

// 监听数据变化
watch([graphNodes, filteredNodes, plotLayout, layoutType], async () => {
  if (isLoaded.value && containerRef.value) {
    try {
      await nextTick();
      await Plotly.react(
        containerRef.value,
        plotTraces.value,
        plotLayout.value,
        plotConfig
      );
    } catch (err) {
      console.warn('Plotly update failed:', err);
    }
  }
});
</script>

<template>
  <div class="graph-3d-wrapper">
    <!-- 布局切换器 -->
    <div class="layout-switcher">
      <button
        v-for="lt in layoutTypes"
        :key="lt.id"
        class="layout-btn"
        :class="{ active: layoutType === lt.id }"
        @click="setLayoutType(lt.id)"
        :title="lt.label"
      >
        <component :is="lt.icon" :size="14" />
        <span>{{ lt.label }}</span>
      </button>
    </div>

    <!-- 控制面板 -->
    <div class="control-panel">
      <!-- 密度滑块 -->
      <div class="control-item">
        <label>Density</label>
        <input
          type="range"
          v-model.number="densityPercent"
          min="10"
          max="100"
          step="10"
        />
        <span class="value">{{ densityPercent }}%</span>
      </div>

      <!-- 标签开关 -->
      <div class="control-item">
        <label>
          <input type="checkbox" v-model="showLabels" />
          Labels
        </label>
      </div>

      <!-- 重置相机 -->
      <button class="reset-btn" @click="resetCamera" title="Reset camera (R)">
        <RotateCcw :size="14" />
      </button>

      <!-- 提示 -->
      <div class="hint">
        Drag to rotate | Scroll to zoom | R to reset
      </div>
    </div>

    <!-- 3D 图形容器 -->
    <div
      ref="containerRef"
      class="graph-3d-container"
      :class="{ loaded: isLoaded }"
    />

    <!-- 节点统计 -->
    <div class="stats-overlay">
      <span class="stat">
        <Eye :size="12" />
        {{ filteredNodes.length }} / {{ graphNodes.length }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.graph-3d-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  background: linear-gradient(135deg, #0a0f1a 0%, #0f172a 50%, #020617 100%);
  border-radius: 20px;
  overflow: hidden;
}

.graph-3d-container {
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.8s ease;
}

.graph-3d-container.loaded {
  opacity: 1;
}

/* 布局切换器 */
.layout-switcher {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  display: flex;
  gap: 4px;
  background: rgba(15, 23, 42, 0.9);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  backdrop-filter: blur(10px);
}

.layout-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.layout-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #f8fafc;
}

.layout-btn.active {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

/* 控制面板 */
.control-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(15, 23, 42, 0.9);
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  backdrop-filter: blur(10px);
  min-width: 160px;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #94a3b8;
}

.control-item label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.control-item input[type="range"] {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  background: rgba(148, 163, 184, 0.2);
  border-radius: 2px;
  outline: none;
}

.control-item input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: #60a5fa;
  border-radius: 50%;
  cursor: pointer;
}

.control-item input[type="range"]::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #60a5fa;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.control-item input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: #60a5fa;
}

.control-item .value {
  min-width: 32px;
  text-align: right;
  color: #f8fafc;
  font-weight: 600;
}

.reset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 6px;
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  border-color: rgba(148, 163, 184, 0.3);
}

.hint {
  font-size: 10px;
  color: #64748b;
  line-height: 1.4;
}

/* 统计覆盖层 */
.stats-overlay {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 10;
  display: flex;
  gap: 12px;
  background: rgba(15, 23, 42, 0.85);
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  backdrop-filter: blur(10px);
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
  font-weight: 600;
}

.stat svg {
  color: #60a5fa;
}
</style>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import Plotly from 'plotly.js-dist-min';
import { useMapStore } from '../store/map.store';
import { useProgressStore } from '../store/progress.store';
import { compute3DPositions, getDefaultCamera, groupByDomain, getDomainCentroid } from '../core/graph3d.layout';
import type { Graph3DNode, GraphLayoutType } from '../types/domain-filter';
import { getDomainColor, getDomainName, DOMAIN_CONFIG, DIMMED_COLOR } from '../types/domain-filter';
import {
  RotateCcw,
  Eye,
  Layers,
  Globe,
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

// 上一个布局类型（用于相机过渡）
const prevLayoutType = ref<GraphLayoutType>('original');

// 相机修订版本（用于重置相机）
const cameraRevision = ref(0);

// 是否正在执行相机过渡动画
const isAnimatingCamera = ref(false);

// 当前高亮的 domain（null 表示无高亮）
const highlightedDomain = ref<string | null>(null);

// Domain 图例配置（过滤掉 default）
const domainConfig = computed(() => {
  return Object.fromEntries(
    Object.entries(DOMAIN_CONFIG).filter(([id]) => id !== 'default')
  );
});

// 高亮前的原始 opacity 映射（traceIndex -> originalOpacity）
const originalOpacities = ref<Map<number, number>>(new Map());

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
    return [];
  }
  return graphNodes.value.filter(node => selectedDomains.has(node.domain));
});

// 构建 Plotly traces
// 3D 图谱配色规则（与 2D 一致）：
//   - Unlocked: 节点发光 + domain 色
//   - Dimmed: 浅灰小点，低透明度（保持探索感）
// 全部混在一起，不按 domain 分组
const plotTraces = computed((): any[] => {
  if (filteredNodes.value.length === 0) return [];

  const unlocked = filteredNodes.value.filter(n => n.visibility === 'Unlocked');
  const dimmed = filteredNodes.value.filter(n => n.visibility === 'Dimmed');

  const traces: any[] = [];

  // Unlocked 节点 — 每个 domain 一种颜色
  const domainGroups = groupByDomain(unlocked);
  for (const [domainId, nodes] of domainGroups) {
    if (nodes.length === 0) continue;
    traces.push({
      x: nodes.map(n => n.x),
      y: nodes.map(n => n.y),
      z: nodes.map(n => n.z),
      mode: 'markers' as const,
      type: 'scatter3d' as const,
      name: getDomainName(domainId),
      hovertemplate: nodes.map(n =>
        `<b>${n.title}</b><br>${getDomainName(domainId)} | Stage ${n.stage}<br>✓ Unlocked<extra></extra>`
      ),
      hoverlabel: {
        bgcolor: '#1f2937',
        font: { size: 12, color: '#f9fafb' },
        align: 'left' as const,
        namelength: -1
      },
      marker: {
        color: getDomainColor(domainId),
        size: 7,
        opacity: 0.9,
        line: { color: 'rgba(255,255,255,0.2)', width: 1 }
      },
      customdata: nodes.map(n => n.id)
    });
  }

  // Dimmed 节点 — 浅灰小点
  if (dimmed.length > 0) {
    traces.push({
      x: dimmed.map(n => n.x),
      y: dimmed.map(n => n.y),
      z: dimmed.map(n => n.z),
      mode: 'markers' as const,
      type: 'scatter3d' as const,
      name: 'Locked',
      hovertemplate: dimmed.map(n =>
        `<b>${n.title}</b><br>○ Locked<extra></extra>`
      ),
      hoverlabel: {
        bgcolor: '#1f2937',
        font: { size: 12, color: '#94a3b8' },
        align: 'left' as const,
        namelength: -1
      },
      marker: {
        color: DIMMED_COLOR,
        size: 4,
        opacity: 0.3,
        line: { color: 'rgba(148,163,184,0.1)', width: 0.5 }
      },
      customdata: dimmed.map(n => n.id)
    });
  }

  return traces;
});

// 是否有数据（用于判断是否渲染 3D 图谱）
const hasData = computed(() => filteredNodes.value.length > 0);

// 场景标注
const sceneAnnotations = computed((): any[] => {
  if (!showLabels.value) return [];
  if (filteredNodes.value.length === 0) return [];

  const groups = groupByDomain(filteredNodes.value);
  const annotations: any[] = [];

  for (const [domainId, nodes] of groups) {
    const centroid = getDomainCentroid(nodes);
    if (!centroid) continue;

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
  { id: 'galaxy', label: 'Galaxy', icon: CircleDot }
];

// 捕获当前相机位置
function captureCurrentCamera(): void {
  if (!containerRef.value) return;
  try {
    const layout = (containerRef.value as any)._fullLayout;
    if (layout?.scene?.camera) {
      // 仅记录，不做其他操作
      (containerRef.value as any)._savedCamera = layout.scene.camera;
    }
  } catch {
    // ignore
  }
}

// 切换布局类型（带相机过渡动画）
function setLayoutType(type: GraphLayoutType): void {
  if (layoutType.value === type) return;
  if (isAnimatingCamera.value) return;

  // 捕获当前相机
  captureCurrentCamera();

  const prev = layoutType.value;
  const next = type;

  // 记录上一个相机
  const savedCamera = (containerRef.value as any)?._savedCamera;

  // 立即更新布局（触发 Plotly.react）
  prevLayoutType.value = prev;
  layoutType.value = type;
  cameraRevision.value++;

  isAnimatingCamera.value = true;

  // 等 Plotly.react 完成（DOM 更新）后，动画相机
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (!containerRef.value) {
        isAnimatingCamera.value = false;
        return;
      }

      // 从当前相机（或上一个默认相机）飞向新布局的默认相机
      const startCamera = savedCamera || getDefaultCamera(prev);
      const endCamera = getDefaultCamera(next);

      // 先用 relayout 设置起点（瞬间），再用 relayout 带动画飞向终点
      Plotly.relayout(containerRef.value, { 'scene.camera': startCamera })
        .then(() => {
          return Plotly.relayout(
            containerRef.value,
            { 'scene.camera': endCamera },
            { transition: { duration: 700, easing: 'cubic-in-out' } }
          );
        })
        .then(() => {
          captureCurrentCamera();
        })
        .catch(() => {
          // silent
        })
        .finally(() => {
          isAnimatingCamera.value = false;
        });
    }, 80);
  });
}

// 重置相机
function resetCamera(): void {
  cameraRevision.value++;
  captureCurrentCamera();
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
    // 记录初始相机位置
    captureCurrentCamera();
  });

  const plotElement = containerRef.value as any;
  if (plotElement && typeof plotElement.on === 'function') {
    plotElement.on('plotly_click', (eventData: any) => {
      if (!eventData.points || eventData.points.length === 0) return;
      const point = eventData.points[0];
      const nodeId: string = Array.isArray(point.customdata) ? point.customdata[0] : point.customdata;
      if (!nodeId) return;
      const node = filteredNodes.value.find(n => n.id === nodeId);
      if (!node) return;
      if (node.visibility === 'Unlocked') {
        mapStore.openNode(nodeId);
      }
    });
    // 拖拽/旋转后自动记录相机
    plotElement.on('plotly_relayout', () => {
      captureCurrentCamera();
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

// 高亮 domain（其他 domain 的节点变暗）
async function highlightDomain(domainId: string): Promise<void> {
  if (!containerRef.value || highlightedDomain.value === domainId) return;

  highlightedDomain.value = domainId;

  const traces = plotTraces.value;
  const updates: { marker: { opacity: number } }[] = [];

  for (const trace of traces) {
    const traceName = trace.name;
    if (traceName === 'Locked') {
      updates.push({ marker: { opacity: 0.3 } });
    } else {
      const isTarget = DOMAIN_CONFIG[domainId]?.name === traceName;
      updates.push({ marker: { opacity: isTarget ? 1.0 : 0.15 } });
    }
  }

  if (updates.length > 0) {
    Plotly.restyle(containerRef.value, updates, undefined).catch(() => {});
  }
}

// 取消高亮，恢复原始 opacity
async function unhighlightDomain(): Promise<void> {
  if (!containerRef.value || highlightedDomain.value === null) return;

  highlightedDomain.value = null;

  const updates: { marker: { opacity: number } }[] = plotTraces.value.map(trace => {
    if (trace.name === 'Locked') return { marker: { opacity: 0.3 } };
    return { marker: { opacity: 0.9 } };
  });

  if (updates.length > 0) {
    Plotly.restyle(containerRef.value, updates, undefined).catch(() => {});
  }
}
watch([graphNodes, filteredNodes, plotLayout], async () => {
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

// 监听最近激活节点变化，自动聚焦相机
watch(() => progressStore.lastActivatedEntry, async (entry) => {
  if (!entry || !containerRef.value || !isLoaded.value) return;

  // 等待 graphNodes 更新完毕（解锁后 visibilityMap 会变化）
  await nextTick();
  await nextTick();

  const node = graphNodes.value.find(n => n.id === entry.nodeId);
  if (!node) return;

  // 相机飞向节点：eye 位置 = 节点坐标 + 偏移
  const offset = 1.4;
  const eyeX = node.x / 50 + offset;
  const eyeY = node.y / 50 + offset;
  const eyeZ = node.z / 50 + offset + 0.5;

  Plotly.animate(
    containerRef.value,
    { 'scene.camera': { eye: { x: eyeX, y: eyeY, z: eyeZ }, center: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 0, z: 1 } } },
    { transition: { duration: 500, easing: 'cubic-in-out' }, frame: { duration: 500 } }
  ).catch(() => {
    // silent
  });
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

    <!-- Domain 图例 -->
    <div class="domain-legend">
      <div
        v-for="(cfg, id) in domainConfig"
        :key="id"
        class="domain-chip"
        :class="{ active: highlightedDomain === id }"
        :style="{ '--chip-color': cfg.color }"
        @mouseenter="highlightDomain(id)"
        @mouseleave="unhighlightDomain()"
      >
        <span class="chip-dot" />
        <span class="chip-name">{{ cfg.name }}</span>
      </div>
    </div>

    <!-- 3D 图形容器 -->
    <div
      ref="containerRef"
      class="graph-3d-container"
      :class="{ loaded: isLoaded }"
    />

    <!-- Clear 状态占位符 -->
    <div v-if="!hasData" class="empty-placeholder">
      <span class="empty-icon">⊘</span>
      <p class="empty-text">Select at least one category</p>
    </div>

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

/* Clear 状态占位符 */
.empty-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 5;
  pointer-events: none;
}

.empty-icon {
  font-size: 48px;
  color: #334155;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
  color: #475569;
  margin: 0;
  font-weight: 500;
}

/* Domain 图例 */
.domain-legend {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  gap: 6px;
  background: rgba(15, 23, 42, 0.85);
  padding: 8px 14px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  backdrop-filter: blur(10px);
  flex-wrap: wrap;
  max-width: calc(100% - 120px);
  justify-content: center;
}

.domain-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  user-select: none;
}

.domain-chip:hover,
.domain-chip.active {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
}

.chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--chip-color);
  flex-shrink: 0;
  box-shadow: 0 0 5px var(--chip-color);
}

.chip-name {
  white-space: nowrap;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import {
  BookOpen, Sparkles, Target, X, Zap, ExternalLink,
  ChevronRight, Clock, Star, TrendingUp, Layers, Hash
} from 'lucide-vue-next';
import { useMapStore } from '../store/map.store';
import type { MapNodeDocument } from '@shared/contract';

const mapStore = useMapStore();
const node = computed(() => mapStore.selectedNode);
const isVisible = computed(() => node.value !== null);

const DIFFICULTY_LABEL: Record<number, string> = {
  1: '入门',
  2: '基础',
  3: '进阶',
  4: '深入',
  5: '专家',
};

const DIFFICULTY_COLOR: Record<number, string> = {
  1: '#22c55e',
  2: '#3b82f6',
  3: '#f59e0b',
  4: '#f97316',
  5: '#ef4444',
};

const TYPE_LABEL: Record<string, string> = {
  concept: '概念',
  primitive: '基础',
  language: '语言',
  runtime: '运行时',
  framework: '框架',
  tool: '工具',
  protocol: '协议',
  hardware: '硬件',
  spec: '规范',
  service: '服务',
};

const TYPE_COLOR: Record<string, string> = {
  concept: '#60a5fa',
  primitive: '#38bdf8',
  language: '#22c55e',
  runtime: '#10b981',
  framework: '#f59e0b',
  tool: '#8b5cf6',
  protocol: '#06b6d4',
  hardware: '#ef4444',
  spec: '#a3e635',
  service: '#ec4899',
};

const POPULARITY_LABEL: Record<string, string> = {
  niche: '小众',
  standard: '标准',
  popular: '流行',
  dominant: '主导',
};

const POPULARITY_COLOR: Record<string, string> = {
  niche: '#64748b',
  standard: '#94a3b8',
  popular: '#f59e0b',
  dominant: '#22c55e',
};

function handleClose(): void {
  mapStore.selectNode(null);
}

function handleEnterSubMap(): void {
  const targetMap = node.value?.targetMap;
  if (targetMap) {
    mapStore.switchMap(targetMap);
    mapStore.selectNode(null);
  }
}

function handleSparkAI(): void {
  alert(`Spark AI: preparing an extended explanation for "${node.value?.title}"...`);
}

const difficultyDisplay = computed(() => {
  const d = node.value?.difficulty;
  if (!d) return null;
  return {
    label: DIFFICULTY_LABEL[d] ?? `Lv.${d}`,
    color: DIFFICULTY_COLOR[d] ?? '#94a3b8',
    value: d,
  };
});

const typeDisplay = computed(() => {
  const t = node.value?.type;
  if (!t) return null;
  return {
    label: TYPE_LABEL[t] ?? t,
    color: TYPE_COLOR[t] ?? '#94a3b8',
  };
});

const popularityDisplay = computed(() => {
  const p = node.value?.popularity;
  if (!p) return null;
  return {
    label: POPULARITY_LABEL[p] ?? p,
    color: POPULARITY_COLOR[p] ?? '#94a3b8',
  };
});

const hasSubMap = computed(() => !!node.value?.targetMap);
const hasResources = computed(() => (node.value?.resources?.length ?? 0) > 0);
const hasAliases = computed(() => (node.value?.aliases?.length ?? 0) > 0);
const hasTags = computed(() => (node.value?.tags?.length ?? 0) > 0);
const hasDeps = computed(() => (node.value?.deps?.length ?? 0) > 0);
</script>

<template>
  <Transition name="sidebar-slide">
    <aside v-if="isVisible && node" class="node-sidebar" role="complementary" aria-label="节点详情">
      <!-- Header -->
      <header class="sidebar-head">
        <div class="head-meta">
          <div class="chip-row">
            <span class="domain-chip" :class="node.domain">
              {{ node.domain.toUpperCase() }}
            </span>
            <span
              v-if="typeDisplay"
              class="type-chip"
              :style="{ color: typeDisplay.color, borderColor: typeDisplay.color + '40', background: typeDisplay.color + '15' }"
            >
              {{ typeDisplay.label }}
            </span>
          </div>
        </div>
        <button class="icon-close" @click="handleClose" aria-label="关闭">
          <X :size="18" />
        </button>
      </header>

      <!-- Body -->
      <div class="sidebar-body custom-scroll">
        <!-- Title -->
        <div class="section-title">
          <h2 class="node-title">{{ node.title }}</h2>
          <p v-if="node.description" class="node-desc">{{ node.description }}</p>
          <p v-else class="node-desc muted">暂无描述</p>
        </div>

        <!-- Metadata Row -->
        <div class="meta-row">
          <div v-if="difficultyDisplay" class="meta-item">
            <Target :size="13" />
            <span class="meta-label">难度</span>
            <div class="difficulty-bar">
              <div
                v-for="i in 5"
                :key="i"
                class="bar-pip"
                :style="{ background: i <= difficultyDisplay.value ? difficultyDisplay.color : 'rgba(148,163,184,0.15)' }"
              ></div>
            </div>
            <span class="meta-value" :style="{ color: difficultyDisplay.color }">{{ difficultyDisplay.label }}</span>
          </div>

          <div v-if="node.estimatedHours" class="meta-item">
            <Clock :size="13" />
            <span class="meta-label">预估</span>
            <span class="meta-value">{{ node.estimatedHours }}h</span>
          </div>

          <div v-if="popularityDisplay" class="meta-item">
            <TrendingUp :size="13" />
            <span class="meta-label">热度</span>
            <span class="meta-value" :style="{ color: popularityDisplay.color }">{{ popularityDisplay.label }}</span>
          </div>
        </div>

        <!-- Resources -->
        <div v-if="hasResources" class="section-block">
          <div class="block-label">
            <BookOpen :size="13" />
            <span>学习资源</span>
          </div>
          <div class="resource-list">
            <a
              v-for="(res, idx) in node.resources"
              :key="idx"
              :href="res.url"
              target="_blank"
              rel="noopener noreferrer"
              class="resource-item"
            >
              <ExternalLink :size="12" />
              <span>{{ res.label }}</span>
            </a>
          </div>
        </div>

        <!-- Aliases -->
        <div v-if="hasAliases" class="section-block">
          <div class="block-label">
            <Hash :size="13" />
            <span>别名</span>
          </div>
          <div class="chip-flex">
            <span
              v-for="alias in node.aliases"
              :key="alias"
              class="tag-chip"
            >#{{ alias }}</span>
          </div>
        </div>

        <!-- Tags -->
        <div v-if="hasTags" class="section-block">
          <div class="block-label">
            <Layers :size="13" />
            <span>标签</span>
          </div>
          <div class="chip-flex">
            <span
              v-for="tag in node.tags"
              :key="tag"
              class="tag-chip tag"
            >{{ tag }}</span>
          </div>
        </div>

        <!-- Dependencies -->
        <div v-if="hasDeps" class="section-block">
          <div class="block-label">
            <Star :size="13" />
            <span>前置依赖</span>
          </div>
          <div class="dep-list">
            <span
              v-for="dep in node.deps"
              :key="dep"
              class="dep-item"
            >{{ dep }}</span>
          </div>
        </div>

        <!-- Enter Sub-map -->
        <div v-if="hasSubMap" class="section-block">
          <button class="submap-btn" @click="handleEnterSubMap">
            <Layers :size="16" />
            <span>进入子图探索</span>
            <ChevronRight :size="16" />
          </button>
        </div>

        <!-- Deep Dive -->
        <div class="section-block deep-dive-box">
          <div class="block-label deep-dive-head">
            <Sparkles :size="14" />
            <span>深度探索</span>
          </div>
          <div class="dive-content">
            <p class="dive-text">
              选中节点后，你可以在图谱中探索它的依赖关系和前置知识。
              点击节点之间的边线可以查看关系的性质。
            </p>
            <div class="dive-tips">
              <div class="tip-item">
                <span class="tip-num">1</span>
                <span>阅读节点描述了解概念</span>
              </div>
              <div class="tip-item">
                <span class="tip-num">2</span>
                <span>查看前置依赖建立知识脉络</span>
              </div>
              <div class="tip-item">
                <span class="tip-num">3</span>
                <span>点击资源链接深入学习</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="sidebar-foot">
        <button class="ai-spark-btn bg-gradient-brand shadow-glow" @click="handleSparkAI">
          <Sparkles :size="16" />
          <span>Ask Spark AI</span>
        </button>
      </footer>
    </aside>
  </Transition>
</template>

<style scoped>
.node-sidebar {
  position: fixed;
  right: 0;
  top: 60px;
  bottom: 0;
  width: 380px;
  background: rgba(8, 15, 30, 0.95);
  border-left: 1px solid rgba(148, 163, 184, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 500;
  backdrop-filter: blur(16px);
  box-shadow: -20px 0 60px rgba(0, 0, 0, 0.4);
}

.sidebar-head {
  padding: 20px 20px 16px 20px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
  flex-shrink: 0;
}

.head-meta {
  flex: 1;
  min-width: 0;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.domain-chip {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.1);
  color: #64748b;
  border: 1px solid rgba(148, 163, 184, 0.15);
}

.type-chip {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid;
}

.icon-close {
  background: transparent;
  border: none;
  color: #475569;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-close:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.08);
}

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-title {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-title {
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #f8fafc;
  line-height: 1.2;
  margin: 0;
}

.node-desc {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.6;
  margin: 0;
}

.node-desc.muted {
  color: #475569;
  font-style: italic;
}

.meta-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.06);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
}

.meta-label {
  font-weight: 600;
  min-width: 32px;
}

.meta-value {
  font-weight: 700;
}

.difficulty-bar {
  display: flex;
  gap: 4px;
}

.bar-pip {
  width: 12px;
  height: 5px;
  border-radius: 3px;
  transition: background 0.3s ease;
}

.section-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.block-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #475569;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(59, 130, 246, 0.06);
  border: 1px solid rgba(59, 130, 246, 0.12);
  border-radius: 8px;
  color: #60a5fa;
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
}

.resource-item:hover {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.25);
  transform: translateX(2px);
}

.chip-flex {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-chip {
  font-size: 11px;
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.08);
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  font-weight: 500;
}

.tag-chip.tag {
  color: #818cf8;
  background: rgba(129, 140, 248, 0.08);
  border-color: rgba(129, 140, 248, 0.15);
}

.dep-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.dep-item {
  font-size: 11px;
  color: #60a5fa;
  background: rgba(59, 130, 246, 0.08);
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid rgba(59, 130, 246, 0.15);
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.submap-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.15));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  color: #a78bfa;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  justify-content: center;
}

.submap-btn:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(59, 130, 246, 0.25));
  border-color: rgba(139, 92, 246, 0.5);
  transform: translateX(2px);
  filter: brightness(1.05);
}

.deep-dive-box {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.06), rgba(8, 145, 178, 0.06));
  border: 1px solid rgba(37, 99, 235, 0.15);
  border-radius: 14px;
  padding: 16px;
}

.deep-dive-head {
  color: #38bdf8;
  margin-bottom: 12px;
}

.dive-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dive-text {
  font-size: 12px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

.dive-tips {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #94a3b8;
}

.tip-num {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  font-size: 10px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sidebar-foot {
  padding: 16px 20px 20px 20px;
  border-top: 1px solid rgba(148, 163, 184, 0.08);
  flex-shrink: 0;
}

.ai-spark-btn {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: none;
  color: white;
  font-weight: 800;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.shadow-glow {
  box-shadow: 0 4px 20px rgba(37, 99, 235, 0.35);
}

.ai-spark-btn:hover {
  transform: translateY(-2px);
  filter: brightness(1.08);
  box-shadow: 0 8px 30px rgba(37, 99, 235, 0.45);
}

/* Slide animation */
.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>

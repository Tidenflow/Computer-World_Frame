<script setup lang="ts">
import { computed } from 'vue';
import { Compass, Crosshair, Trash2 } from 'lucide-vue-next';
import { useProgressStore } from '../store/progress.store';
import { useMapStore } from '../store/map.store';

const progressStore = useProgressStore();
const mapStore = useMapStore();

const latestEntries = computed(() => {
  if (!mapStore.frameMap) return [];

  return progressStore.latestInputEntries
    .map(entry => {
      const node = mapStore.frameMap?.nodes.find(candidate => candidate.id === entry.nodeId);
      if (!node) return null;

      return {
        nodeId: entry.nodeId,
        matchedTerm: entry.matchedTerm,
        unlockedAt: entry.unlockedAt,
        label: node.label,
        category: node.category || 'default'
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
});

const hasStrictEmptyState = computed(() =>
  progressStore.hasLatestInput && latestEntries.value.length === 0
);

function handleClear(): Promise<void> {
  return progressStore.resetLocalProgress();
}

function focusEntry(nodeId: number): void {
  mapStore.focusNode(nodeId);
}

function getTimeText(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return new Date(timestamp).toLocaleDateString();
}
</script>

<template>
  <div v-if="progressStore.hasLatestInput" class="history-panel glass-panel">
    <div class="panel-header">
      <div class="title-group">
        <Compass :size="18" class="icon-muted" />
        <div class="title-stack">
          <h3>最近一次输入结果</h3>
          <p class="panel-subtitle">{{ progressStore.latestInputText || '本轮输入' }}</p>
        </div>
      </div>
      <button class="clear-btn" @click="handleClear">
        <Trash2 :size="14" />
        <span>重置</span>
      </button>
    </div>

    <div v-if="latestEntries.length > 0" class="entries-list custom-scroll">
      <button
        v-for="entry in latestEntries"
        :key="entry.nodeId"
        class="entry-item"
        @click="focusEntry(entry.nodeId)"
      >
        <div class="entry-content">
          <div class="entry-row">
            <span class="entry-node">{{ entry.label }}</span>
            <span class="entry-time">{{ getTimeText(entry.unlockedAt) }}</span>
          </div>
          <div class="entry-sub">匹配词: {{ entry.matchedTerm }}</div>
        </div>
        <div class="entry-side">
          <div class="category-dot" :class="entry.category"></div>
          <Crosshair :size="14" class="entry-focus-icon" />
        </div>
      </button>
    </div>

    <div v-else-if="hasStrictEmptyState" class="empty-state">
      <div class="empty-title">本次输入没有点亮新的节点</div>
      <div class="empty-text">图谱没有发生新的变化，因此这里不会回退显示旧结果。</div>
    </div>
  </div>
</template>

<style scoped>
.history-panel {
  padding: 20px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 180px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.title-group {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.title-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title-stack h3 {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.panel-subtitle {
  font-size: 11px;
  color: var(--text-weak);
  line-height: 1.5;
}

.icon-muted {
  color: var(--text-weak);
  margin-top: 1px;
}

.clear-btn {
  background: transparent;
  border: none;
  color: var(--text-weak);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.clear-btn:hover {
  color: var(--error);
  background: rgba(239, 68, 68, 0.1);
}

.entries-list {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
}

.entry-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
  padding: 12px 16px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: var(--transition-smooth);
  text-align: left;
}

.entry-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--border-highlight);
  transform: translateX(4px);
}

.entry-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.entry-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.entry-node {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.entry-time {
  font-size: 10px;
  color: var(--text-weak);
  white-space: nowrap;
}

.entry-sub {
  font-size: 11px;
  color: var(--text-muted);
}

.entry-side {
  display: flex;
  align-items: center;
  gap: 8px;
}

.entry-focus-icon {
  color: var(--text-weak);
}

.empty-state {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 8px 2px;
}

.empty-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.empty-text {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
}

.category-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.fundamentals { background: #60a5fa; }
.hardware { background: #38bdf8; }
.os { background: #a855f7; }
.network { background: #0ea5e9; }
.programming { background: #22c55e; }
.data { background: #f59e0b; }
.application { background: #f43f5e; }
.default { background: #94a3b8; }
</style>

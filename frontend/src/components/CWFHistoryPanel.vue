<script setup lang="ts">
import { computed } from 'vue';
import { Compass, Undo2, RotateCcw } from 'lucide-vue-next';
import { useProgressStore } from '../store/progress.store';
import { useMapStore } from '../store/map.store';

const progressStore = useProgressStore();
const mapStore = useMapStore();

// 左侧列表：仅展示最近一次点亮的节点（undoStack 栈顶）
const lastEntry = computed(() => {
  if (!mapStore.frameMap || !progressStore.lastActivatedEntry) return null;
  const node = mapStore.frameMap.document.nodes.find(n => n.id === progressStore.lastActivatedEntry!.nodeId);
  if (!node) return null;
  return {
    nodeId: node.id,
    label: node.title,
    domain: node.domain,
    unlockedAt: progressStore.lastActivatedEntry.unlockedAt
  };
});

function handleUndo(): void {
  const stack = progressStore.undoStack;
  if (stack.length === 0) return;

  // 弹出栈顶
  const popped = stack.pop();
  if (!popped) return;

  // 从 unlocked 中移除该节点
  delete progressStore.progress.unlocked[popped.nodeId];
  progressStore.persistUndoStack();

  // 如果栈空了，清空 latestInput
  if (stack.length === 0) {
    progressStore.clearLatestInputResult();
  }
}

function handleReset(): void {
  void progressStore.resetLocalProgress();
}

function focusEntry(nodeId: string): void {
  mapStore.focusNode(nodeId);
}

function getTimeText(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return new Date(timestamp).toLocaleDateString();
}

const undoCount = computed(() => progressStore.undoCount);
const hasContent = computed(() => lastEntry.value !== null);
</script>

<template>
  <div class="history-panel glass-panel">
    <div class="panel-header">
      <div class="title-group">
        <Compass :size="18" class="icon-muted" />
        <div class="title-stack">
          <h3>最近点亮</h3>
          <p v-if="hasContent" class="panel-subtitle">{{ getTimeText(lastEntry!.unlockedAt) }}</p>
          <p v-else class="panel-subtitle">还没有点亮任何节点</p>
        </div>
      </div>
      <div class="action-buttons">
        <button
          class="action-btn undo-btn"
          :class="{ disabled: undoCount === 0 }"
          :disabled="undoCount === 0"
          :title="undoCount > 0 ? `撤销最近一次点亮（还有 ${undoCount} 条记录）` : '没有可撤销的记录'"
          @click="handleUndo"
        >
          <Undo2 :size="14" />
          <span v-if="undoCount > 0">撤销({{ undoCount }})</span>
          <span v-else>撤销</span>
        </button>
        <button
          class="action-btn reset-btn"
          :disabled="undoCount === 0"
          title="重置所有点亮记录"
          @click="handleReset"
        >
          <RotateCcw :size="14" />
          <span>重置</span>
        </button>
      </div>
    </div>

    <!-- 最近一次点亮的节点 -->
    <div v-if="lastEntry" class="entry-card" @click="focusEntry(lastEntry.nodeId)">
      <div class="entry-main">
        <div class="entry-label">{{ lastEntry.label }}</div>
        <div class="entry-domain-tag" :class="lastEntry.domain">{{ lastEntry.domain.toUpperCase() }}</div>
      </div>
      <div class="entry-meta">
        <span class="entry-time">{{ getTimeText(lastEntry.unlockedAt) }}</span>
        <span class="entry-hint">点击聚焦节点</span>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <p>搜索框输入术语，点亮知识图谱中的节点</p>
      <p class="empty-sub">点亮后会在这里显示，点撤销可回退</p>
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
  min-height: 160px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
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

/* Action buttons */
.action-buttons {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn {
  background: transparent;
  border: 1px solid var(--border-slate);
  color: var(--text-muted);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: var(--transition-smooth);
  white-space: nowrap;
}

.action-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  border-color: var(--border-highlight);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.undo-btn:hover:not(:disabled) {
  border-color: var(--blue-400);
  color: var(--blue-400);
}

.reset-btn:hover:not(:disabled) {
  border-color: var(--error);
  color: var(--error);
  background: rgba(239, 68, 68, 0.08);
}

/* Entry card */
.entry-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-slate);
  padding: 16px 18px;
  border-radius: 12px;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.entry-card:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: var(--blue-400);
  transform: translateX(3px);
}

.entry-main {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.entry-label {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
}

.entry-domain-tag {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  padding: 2px 7px;
  border-radius: 6px;
  opacity: 0.75;
}

.entry-domain-tag.fundamentals { background: rgba(96, 165, 250, 0.15); color: #60a5fa; }
.entry-domain-tag.hardware { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
.entry-domain-tag.os { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
.entry-domain-tag.network { background: rgba(14, 165, 233, 0.15); color: #0ea5e9; }
.entry-domain-tag.programming { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.entry-domain-tag.data { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.entry-domain-tag.application { background: rgba(244, 63, 94, 0.15); color: #f43f5e; }

.entry-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.entry-time {
  font-size: 11px;
  color: var(--text-weak);
}

.entry-hint {
  font-size: 10px;
  color: var(--text-weak);
  opacity: 0.6;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-height: 80px;
  padding: 4px 2px;
}

.empty-state p {
  font-size: 13px;
  color: var(--text-muted);
}

.empty-sub {
  font-size: 11px !important;
  color: var(--text-weak) !important;
  opacity: 0.7;
}
</style>

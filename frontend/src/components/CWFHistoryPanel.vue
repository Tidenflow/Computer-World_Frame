<script setup lang="ts">
import { computed } from 'vue';
import { Compass, Undo2, RotateCcw } from 'lucide-vue-next';
import { useProgressStore, type LatestUnlockEntry } from '../store/progress.store';
import { useMapStore } from '../store/map.store';

const progressStore = useProgressStore();
const mapStore = useMapStore();

/**
 * 当前仍在 undoStack 中的最新搜索节点
 * 撤销某个节点后，该节点自动从列表中消失（保持同步）
 */
const lastSearchEntries = computed((): Array<LatestUnlockEntry & { node: { id: string; title: string; domain: string } }> => {
  if (!mapStore.frameMap) return [];
  const currentNodeIds = new Set(progressStore.undoStack.map(e => e.nodeId));
  return progressStore.latestInputEntries
    .filter(entry => currentNodeIds.has(entry.nodeId))
    .map(entry => {
      const node = mapStore.frameMap!.document.nodes.find(n => n.id === entry.nodeId);
      return node ? { ...entry, node } : null;
    })
    .filter(Boolean) as Array<LatestUnlockEntry & { node: { id: string; title: string; domain: string } }>;
});

/**
 * 当前 undoStack 顶部的 entry（用于时间戳显示）
 */
const latestEntryTimestamp = computed(() => {
  if (progressStore.undoStack.length === 0) return null;
  return progressStore.undoStack[progressStore.undoStack.length - 1].unlockedAt;
});

const hasContent = computed(() => lastSearchEntries.value.length > 0);

function handleUndo(): void {
  const { nodeId } = progressStore.undo();
  if (nodeId) {
    mapStore.focusNode(nodeId);
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
</script>

<template>
  <div class="history-panel glass-panel">
    <div class="panel-header">
      <div class="title-group">
        <Compass :size="18" class="icon-muted" />
        <div class="title-stack">
          <h3>最近点亮</h3>
          <p v-if="hasContent" class="panel-subtitle">{{ getTimeText(latestEntryTimestamp!) }}</p>
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

    <!-- 最近一次搜索点亮的节点列表 -->
    <div v-if="hasContent" class="entries-list">
      <div
        v-for="(entry, idx) in lastSearchEntries"
        :key="entry.node.id"
        class="entry-card"
        @click="focusEntry(entry.node.id)"
      >
        <div class="entry-main">
          <span class="entry-index">{{ idx + 1 }}</span>
          <div class="entry-label">{{ entry.node.title }}</div>
          <div class="entry-domain-tag" :class="entry.node.domain">{{ entry.node.domain.toUpperCase() }}</div>
        </div>
        <div class="entry-meta">
          <span class="entry-term">"{{ entry.matchedTerm }}"</span>
          <span class="entry-hint">点击聚焦</span>
        </div>
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

/* Entries list */
.entries-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.entries-list::-webkit-scrollbar { width: 4px; }
.entries-list::-webkit-scrollbar-track { background: transparent; }
.entries-list::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 4px; }
.entries-list { scrollbar-width: thin; scrollbar-color: rgba(148, 163, 184, 0.3) transparent; }

/* Entry card */
.entry-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-slate);
  padding: 12px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: var(--transition-smooth);
  overflow: hidden;
  min-width: 0;
}

.entry-card:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: var(--blue-400);
  transform: translateX(3px);
}

.entry-card .tags {
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.entry-main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 6px;
  overflow: hidden;
  min-width: 0;
}

.entry-index {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: linear-gradient(135deg, #ef4444, #f97316);
  color: white;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.entry-label {
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-domain-tag {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  padding: 2px 7px;
  border-radius: 6px;
  opacity: 0.75;
  flex-shrink: 0;
  white-space: nowrap;
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
  gap: 8px;
  overflow: hidden;
  min-width: 0;
}

.entry-term {
  font-size: 11px;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
  min-width: 0;
}

.entry-hint {
  font-size: 10px;
  color: var(--text-weak);
  opacity: 0.6;
  white-space: nowrap;
  flex-shrink: 0;
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

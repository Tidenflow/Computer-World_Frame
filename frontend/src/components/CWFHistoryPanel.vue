<script setup lang="ts">
import { History, Trash2 } from 'lucide-vue-next';
import { useProgressStore } from '../store/progress.store';
import { useMapStore } from '../store/map.store';
import { computed } from 'vue';

const progressStore = useProgressStore();
const mapStore = useMapStore();

const historyEntries = computed(() => {
  if (!mapStore.frameMap) return [];
  
  return Object.entries(progressStore.progress.unlockedNodes)
    .map(([nodeId, info]) => {
      const node = mapStore.frameMap?.nodes.find(n => n.id === parseInt(nodeId));
      return {
        id: nodeId,
        name: node?.label || '未知节点',
        time: info.unlockedAt,
        category: node?.category || 'default',
        matchedTerm: (info as any).matchedTerm || node?.label
      };
    })
    .sort((a, b) => b.time - a.time);
});

async function handleClear() {
  if (confirm('确定要重置本地进度并清空历史记录吗？此操作将同步至云端。')) {
    await progressStore.resetLocalProgress();
  }
}

function selectNode(id: string) {
  mapStore.selectNode(parseInt(id));
}

function getTimeText(timestamp: number) {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return new Date(timestamp).toLocaleDateString();
}
</script>

<template>
  <div class="history-panel glass-panel" v-if="historyEntries.length > 0">
    <div class="panel-header">
      <div class="title-group">
        <History :size="18" class="icon-muted" />
        <h3>点亮历史</h3>
      </div>
      <button class="clear-btn" @click="handleClear">
        <Trash2 :size="14" />
        <span>清空</span>
      </button>
    </div>

    <div class="entries-list custom-scroll">
      <div 
        v-for="entry in historyEntries" 
        :key="entry.id"
        class="entry-item"
        @click="selectNode(entry.id)"
      >
        <div class="entry-content">
          <div class="entry-row">
            <span class="entry-node">{{ entry.name }}</span>
            <span class="entry-time">{{ getTimeText(entry.time) }}</span>
          </div>
          <div class="entry-sub">匹配词: {{ entry.matchedTerm }}</div>
        </div>
        <div class="category-dot" :class="entry.category"></div>
      </div>
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
  max-height: 500px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-group h3 {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.icon-muted { color: var(--text-weak); }

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
}

.entry-node {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.entry-time {
  font-size: 10px;
  color: var(--text-weak);
}

.entry-sub {
  font-size: 11px;
  color: var(--text-muted);
}

.category-dot { width: 8px; height: 8px; border-radius: 50%; }

/* 分类颜色对齐 */
.fundamentals { background: #60a5fa; }
.hardware { background: #38bdf8; }
.os { background: #a855f7; }
.network { background: #0ea5e9; }
.programming { background: #22c55e; }
.data { background: #f59e0b; }
.application { background: #f43f5e; }
</style>

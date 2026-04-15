<script setup lang="ts">
import { ref } from 'vue';
import { Search, Sparkles, CheckCircle2, XCircle } from 'lucide-vue-next';
import { useMapStore } from '../store/map.store';
import { useProgressStore, type LatestUnlockEntry } from '../store/progress.store';
import { extractTerms, matchNodeByTermAsync } from '../core/matching';

const mapStore = useMapStore();
const progressStore = useProgressStore();

const inputValue = ref('');

// 本次搜索结果反馈
const result = ref<{
  term: string;
  status: 'success' | 'no-new' | 'not-found';
  nodeName?: string;
  detail?: string;
} | null>(null);

// 用户按回车时的处理逻辑
async function handleEnter(): Promise<void> {
  if (!mapStore.frameMap || !inputValue.value.trim()) return;

  const terms = extractTerms(inputValue.value);
  const newEntries: LatestUnlockEntry[] = [];

  for (const term of terms) {
    const matchResult = await matchNodeByTermAsync(
      term,
      mapStore.frameMap.document.nodes,
      mapStore.frameMap.document.version
    );

    if (matchResult.candidates.length === 0) {
      result.value = { term, status: 'not-found', detail: '未找到相关节点，请尝试其他术语' };
      clearResult();
      return;
    }

    // 点亮所有候选节点
    for (const candidate of matchResult.candidates) {
      if (!candidate.node) continue;
      const unlockResult = await progressStore.unlockNode(candidate.node, term);
      if (unlockResult.isNewlyUnlocked) {
        newEntries.push({
          nodeId: candidate.node.id,
          matchedTerm: term,
          unlockedAt: Date.now()
        });
      }
    }
  }

  if (newEntries.length > 0) {
    // 保存到 store（供历史面板使用）
    progressStore.setLatestInputResult(inputValue.value.trim(), newEntries);

    // 聚焦第一个节点
    const firstNode = mapStore.frameMap.document.nodes.find(n => n.id === newEntries[0].nodeId);
    if (firstNode) {
      mapStore.focusNode(firstNode.id);
    }

    result.value = {
      term: terms[0],
      status: 'success',
      nodeName: firstNode?.title,
      detail: newEntries.length > 1 ? `点亮 ${newEntries.length} 个新节点` : '已点亮新的节点'
    };
  } else {
    result.value = { term: terms[0], status: 'no-new', detail: '匹配到了节点，但这次没有点亮新的节点' };
  }

  inputValue.value = '';
  clearResult();
}

function clearResult(): void {
  setTimeout(() => { result.value = null; }, 4000);
}
</script>

<template>
  <div class="search-container">
    <!-- Match feedback toast -->
    <Transition name="feedback-slide">
      <div
        v-if="result"
        class="feedback-toast glass-panel"
        :class="{ success: result.status === 'success' }"
      >
        <div class="icon-indicator">
          <CheckCircle2 v-if="result.status === 'success'" class="icon-success" :size="24" />
          <XCircle v-else class="icon-error" :size="24" />
        </div>
        <div class="feedback-info">
          <div class="status-title">
            {{ result.status === 'success' ? '点亮成功！' : result.status === 'no-new' ? '没有新的点亮' : '未找到匹配' }}
          </div>
          <div class="status-detail">
            {{ result.status === 'success' ? `"${result.term}" → ${result.nodeName}` : result.detail }}
          </div>
        </div>
        <Sparkles v-if="result.status === 'success'" class="spark-fx" :size="20" />
      </div>
    </Transition>

    <!-- Search bar -->
    <div class="search-bar-wrapper">
      <div class="search-bar glass-panel">
        <Search :size="20" class="search-icon" />
        <input
          v-model="inputValue"
          placeholder="输入任何计算机相关的术语..."
          @keyup.enter="void handleEnter()"
          class="search-input"
        />
        <button
          @click="void handleEnter()"
          class="ignite-btn bg-gradient-brand"
          :disabled="!inputValue.trim()"
        >
          <Sparkles :size="20" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.search-bar-wrapper {
  width: 100%;
  max-width: 560px;
  position: relative;
  z-index: 200;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 6px 6px 16px;
  border-radius: 16px;
  transition: var(--transition-smooth);
  border: 1px solid var(--border-slate);
}

.search-icon { color: var(--text-weak); }

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 15px;
  color: var(--text-primary);
  outline: none;
  padding: 10px 0;
}

.ignite-btn {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.ignite-btn:hover:not(:disabled) {
  transform: scale(1.05);
  filter: brightness(1.1);
}

/* Toast */
.feedback-toast {
  position: fixed;
  bottom: 80px;
  right: 40px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  z-index: 3000;
}

.feedback-toast.success { border-color: var(--success); }
.feedback-info { display: flex; flex-direction: column; }
.status-title { font-weight: 800; color: var(--text-primary); }
.status-detail { font-size: 12px; color: var(--text-muted); }
.icon-success { color: var(--success); }
.icon-error { color: var(--error); }

/* Transitions */
.feedback-slide-enter-active,
.feedback-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.feedback-slide-enter-from {
  transform: translateX(100px);
  opacity: 0;
}
.feedback-slide-leave-to {
  transform: translateY(-50px);
  opacity: 0;
}
</style>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Search, Sparkles, CheckCircle2, XCircle, ChevronDown } from 'lucide-vue-next';
import { useMapStore } from '../store/map.store';
import { useProgressStore } from '../store/progress.store';
import { extractTerms, matchNodeByTerm } from '../core/matching';
import type { MatchResult, MatchCandidate } from '../core/matching';

const mapStore = useMapStore();
const progressStore = useProgressStore();

const inputValue = ref('');
const result = ref<{
  term: string;
  status: 'success' | 'no-new' | 'not-found';
  nodeName?: string;
  detail?: string;
} | null>(null);

// 多候选列表相关状态
const showCandidates = ref(false);
const selectedCandidateIndex = ref(0);
const candidates = ref<MatchCandidate[]>([]);

// 用户选择了某个候选后，点亮该节点
async function activateCandidate(candidate: MatchCandidate): Promise<void> {
  if (!candidate.node) return;
  const unlockResult = await progressStore.unlockNode(candidate.node, inputValue.value.trim());
  if (unlockResult.isNewlyUnlocked) {
    mapStore.focusNode(candidate.node.id);
  }
  showCandidates.value = false;
  candidates.value = [];
  inputValue.value = '';
}

// 用户按回车时的处理逻辑
async function handleEnter(): Promise<void> {
  if (!mapStore.frameMap || !inputValue.value.trim()) return;

  // 如果候选列表已展开，使用键盘选中的候选
  if (showCandidates.value && candidates.value.length > 0) {
    const selected = candidates.value[selectedCandidateIndex.value];
    if (selected?.node) {
      await activateCandidate(selected);
    }
    return;
  }

  // 否则走原有逻辑：单术语匹配
  const terms = extractTerms(inputValue.value);
  const latestEntries: Array<{ nodeId: string; matchedTerm: string; unlockedAt: number }> = [];
  let hasMatchedNode = false;

  for (const term of terms) {
    const matchResult = matchNodeByTerm(term, mapStore.frameMap.document.nodes);

    if (matchResult.candidates.length === 0) {
      // 未找到任何候选
      result.value = { term, status: 'not-found', detail: '未找到相关节点，请尝试其他术语' };
      clearResult();
      return;
    }

    if (matchResult.autoSelect && matchResult.candidates[0].node) {
      // 单候选自动点亮
      const node = matchResult.candidates[0].node;
      hasMatchedNode = true;
      const unlockResult = await progressStore.unlockNode(node, term);
      if (unlockResult.isNewlyUnlocked) {
        latestEntries.push({ nodeId: node.id, matchedTerm: term, unlockedAt: Date.now() });
      }
    } else {
      // 多候选 → 展开候选列表
      candidates.value = matchResult.candidates;
      selectedCandidateIndex.value = 0;
      showCandidates.value = true;
      return; // 等待用户选择
    }
  }

  if (latestEntries.length > 0) {
    progressStore.setLatestInputResult(inputValue.value.trim(), latestEntries);
    const latestNode = mapStore.frameMap.document.nodes.find(n => n.id === latestEntries[0].nodeId);
    result.value = {
      term: terms[0],
      status: 'success',
      nodeName: latestNode?.title,
      detail: latestEntries.length > 1 ? `点亮 ${latestEntries.length} 个新节点` : '已点亮新的节点'
    };
  } else if (hasMatchedNode) {
    result.value = { term: terms[0], status: 'no-new', detail: '匹配到了节点，但这次没有点亮新的节点' };
  } else {
    result.value = { term: terms[0], status: 'not-found', detail: '试试其他术语吧' };
  }

  inputValue.value = '';
  clearResult();
}

// 监听输入变化：实时搜索
watch(inputValue, (val) => {
  if (!val.trim() || !mapStore.frameMap) {
    candidates.value = [];
    showCandidates.value = false;
    return;
  }

  // 只对第一个词做实时预览
  const terms = extractTerms(val);
  if (terms.length === 1) {
    const matchResult = matchNodeByTerm(terms[0], mapStore.frameMap.document.nodes);
    if (matchResult.candidates.length >= 1) {
      candidates.value = matchResult.candidates;
      selectedCandidateIndex.value = 0;
      // 多候选且非自动选中时，才展开列表
      if (!matchResult.autoSelect) {
        showCandidates.value = true;
      }
    } else {
      candidates.value = [];
      showCandidates.value = false;
    }
  } else {
    // 多词输入时不展开预览，等回车处理
    showCandidates.value = false;
    candidates.value = [];
  }
});

function handleKeydown(e: KeyboardEvent): void {
  if (!showCandidates.value) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedCandidateIndex.value = Math.min(selectedCandidateIndex.value + 1, candidates.value.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedCandidateIndex.value = Math.max(selectedCandidateIndex.value - 1, 0);
  } else if (e.key === 'Escape') {
    showCandidates.value = false;
  }
}

function selectSuggestion(s: string): void {
  inputValue.value = s;
  void handleEnter();
}

function clearResult(): void {
  setTimeout(() => { result.value = null; }, 4000);
}

function getMatchTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    exact: '精确',
    alias: '别名',
    partial: '部分',
    fuzzy: '模糊',
    suggestion: '建议',
    'non-tech': '提示'
  };
  return labels[type] || '';
}

const matchTypeColor: Record<string, string> = {
  exact: 'type-exact',
  alias: 'type-alias',
  partial: 'type-partial',
  fuzzy: 'type-fuzzy',
  suggestion: 'type-suggestion',
  'non-tech': 'type-nontech'
};

const exampleTerms = ['Python', 'CPU', '显卡', '操作系统', '算法', '神经网络', 'React', 'Linux', '数据库'];
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
      <div class="search-bar glass-panel" :class="{ active: showCandidates }">
        <Search :size="20" class="search-icon" />
        <input
          v-model="inputValue"
          placeholder="输入任何计算机相关的术语..."
          @keyup.enter="void handleEnter()"
          @keydown="handleKeydown"
          @focus="if (candidates.length > 0) showCandidates = true"
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

      <!-- Multiple candidates dropdown -->
      <Transition name="dropdown">
        <div v-if="showCandidates && candidates.length > 0" class="candidates-dropdown glass-panel">
          <div class="candidates-header">
            <span class="candidates-hint">找到 {{ candidates.length }} 个候选，选择一个后回车确认：</span>
            <button class="close-btn" @click="showCandidates = false">
              <XCircle :size="14" />
            </button>
          </div>
          <div class="candidates-list">
            <button
              v-for="(candidate, idx) in candidates"
              :key="candidate.node?.id || idx"
              class="candidate-item"
              :class="{ selected: idx === selectedCandidateIndex }"
              @click="void activateCandidate(candidate)"
              @mouseenter="selectedCandidateIndex = idx"
            >
              <span class="candidate-index">{{ idx }}</span>
              <div class="candidate-body">
                <div class="candidate-title">
                  {{ candidate.node?.title || '未找到匹配' }}
                </div>
                <div v-if="candidate.contextHints.length > 0" class="candidate-hints">
                  <span
                    v-for="hint in candidate.contextHints.slice(0, 2)"
                    :key="hint"
                    class="hint-tag"
                  >{{ hint }}</span>
                </div>
                <div v-if="candidate.node" class="candidate-match-type">
                  <span :class="['match-type-badge', matchTypeColor[candidate.matchType]]">
                    {{ getMatchTypeLabel(candidate.matchType) }}
                  </span>
                </div>
                <div v-else class="candidate-message">
                  {{ candidate.contextHints[0] || '' }}
                </div>
              </div>
            </button>
          </div>
        </div>
      </Transition>

      <!-- Example terms (shown when input is empty and no candidates) -->
      <Transition name="dropdown">
        <div v-if="!showCandidates && !inputValue" class="suggestions-dropdown glass-panel">
          <div class="suggest-title">热门搜索关键词：</div>
          <div class="suggest-grid">
            <button
              v-for="term in exampleTerms"
              :key="term"
              @click="selectSuggestion(term)"
              class="suggest-tag"
            >
              {{ term }}
            </button>
          </div>
        </div>
      </Transition>
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

.search-bar.active {
  border-color: var(--blue-400);
  box-shadow: 0 0 30px rgba(37, 99, 235, 0.2);
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

/* Candidates dropdown */
.candidates-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  right: 0;
  border-radius: 16px;
  overflow: hidden;
  z-index: 100;
}

.candidates-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px 10px;
}

.candidates-hint {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-weak);
  letter-spacing: 0.1em;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-weak);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 2px;
  border-radius: 4px;
  transition: var(--transition-smooth);
}

.close-btn:hover { color: var(--text-primary); }

.candidates-list {
  padding: 0 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 320px;
  overflow-y: auto;
}

.candidate-item {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  transition: var(--transition-smooth);
  text-align: left;
  width: 100%;
}

.candidate-item:hover,
.candidate-item.selected {
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--border-slate);
}

.candidate-item.selected {
  border-color: var(--blue-400);
  background: rgba(37, 99, 235, 0.08);
}

.candidate-index {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.candidate-item.selected .candidate-index {
  background: rgba(37, 99, 235, 0.3);
  color: var(--blue-400);
}

.candidate-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.candidate-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.candidate-hints {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.hint-tag {
  font-size: 10px;
  color: var(--text-weak);
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 6px;
  border-radius: 4px;
}

.candidate-match-type {
  display: flex;
  gap: 4px;
}

.match-type-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.type-exact { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.type-alias { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.type-partial { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
.type-fuzzy { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.type-suggestion { background: rgba(14, 165, 233, 0.15); color: #0ea5e9; }
.type-nontech { background: rgba(239, 68, 68, 0.12); color: #ef4444; }

.candidate-message {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
}

/* Suggestions (example terms) */
.suggestions-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  left: 0;
  right: 0;
  padding: 18px;
  border-radius: 16px;
  z-index: 100;
}

.suggest-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-weak);
  margin-bottom: 12px;
  letter-spacing: 0.1em;
}

.suggest-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.suggest-tag {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-slate);
  color: var(--text-muted);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.suggest-tag:hover {
  background: var(--bg-card);
  color: var(--text-primary);
  border-color: var(--blue-400);
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
.dropdown-enter-active, .dropdown-leave-active { transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-8px); }

.feedback-slide-enter-active, .feedback-slide-leave-active { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.feedback-slide-enter-from { transform: translateX(100px); opacity: 0; }
.feedback-slide-leave-to { transform: translateY(-50px); opacity: 0; }
</style>

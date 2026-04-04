<script setup lang="ts">
import { ref } from 'vue';
import { Search, Sparkles, CheckCircle2, XCircle } from 'lucide-vue-next';
import { useMapStore } from '../store/map.store';
import { useProgressStore } from '../store/progress.store';
import { extractTerms, matchNodeByTerm } from '../core/matching';

const mapStore = useMapStore();
const progressStore = useProgressStore();

const inputValue = ref('');
const result = ref<{
  term: string;
  status: 'success' | 'no-new' | 'not-found';
  nodeName?: string;
  detail?: string;
} | null>(null);
const showSuggestions = ref(false);

const exampleTerms = [
  'Python', 'CPU', '显卡', '操作系统', '算法', 
  '神经网络', 'React', 'Linux', '数据库'
];

/**
 * 尝试将输入框内容匹配到节点并解锁。
 *
 * 流程：
 * - 将输入拆分为多个术语（支持逗号/空格）
 * - 对每个术语尝试匹配节点并调用 `progressStore.unlockNode`
 * - 将匹配结果写入 `result` 作为 toast 展示
 *
 * @returns void
 *
 * @sideEffects
 * - 可能触发进度更新（包含网络同步）
 * - 会清空 inputValue、关闭建议面板，并设置/清理 result
 */
async function handleUnlock(): Promise<void> {
  if (!mapStore.frameMap || !inputValue.value.trim()) return;

  const rawInput = inputValue.value.trim();
  const terms = extractTerms(inputValue.value);
  const latestEntries: Array<{ nodeId: number; matchedTerm: string; unlockedAt: number }> = [];
  let hasMatchedNode = false;

  for (const term of terms) {
    const matchedNode = matchNodeByTerm(term, mapStore.frameMap.nodes);
    if (matchedNode) {
      hasMatchedNode = true;
      const unlockResult = await progressStore.unlockNode(matchedNode, term);
      if (unlockResult.isNewlyUnlocked) {
        latestEntries.push({
          nodeId: matchedNode.id,
          matchedTerm: term,
          unlockedAt: Date.now()
        });
      }
    }
  }

  progressStore.setLatestInputResult(rawInput, latestEntries);

  if (latestEntries.length === 1) {
    mapStore.focusNode(latestEntries[0].nodeId);
  }

  if (latestEntries.length > 0) {
    const latestNode = mapStore.frameMap.nodes.find(node => node.id === latestEntries[0].nodeId);
    result.value = {
      term: terms[0],
      status: 'success',
      nodeName: latestNode?.label,
      detail: latestEntries.length > 1 ? `本次点亮 ${latestEntries.length} 个新节点` : '已点亮新的节点'
    };
  } else if (hasMatchedNode) {
    result.value = {
      term: terms[0],
      status: 'no-new',
      detail: '匹配到了节点，但这次没有点亮新的节点'
    };
  } else {
    result.value = { term: terms[0], status: 'not-found', detail: '试试其他术语吧' };
  }

  inputValue.value = '';
  showSuggestions.value = false;
  clearResult();
}

/**
 * 选择一个推荐术语：写入输入框并立即触发解锁逻辑。
 *
 * @param s - 推荐术语文本
 * @returns void
 */
function selectSuggestion(s: string): void {
  inputValue.value = s;
  void handleUnlock();
}

/**
 * 延迟清除匹配结果 toast。
 *
 * @returns void
 *
 * @sideEffects 4 秒后会将 `result.value` 置为 null
 */
function clearResult(): void {
  setTimeout(() => {
    result.value = null;
  }, 4000);
}
</script>

<template>
  <div class="search-container">
    <!-- 匹配反馈 Toast -->
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
            {{
              result.status === 'success'
                ? '匹配成功！'
                : result.status === 'no-new'
                  ? '没有新的点亮'
                  : '未找到匹配'
            }}
          </div>
          <div class="status-detail">
            {{ result.status === 'success' ? `"${result.term}" → ${result.nodeName}` : result.detail }}
          </div>
        </div>
        <Sparkles v-if="result.status === 'success'" class="spark-fx" :size="20" />
      </div>
    </Transition>

    <!-- 搜索栏主体 -->
    <div class="search-bar-wrapper">
      <div class="search-bar glass-panel" :class="{ active: showSuggestions && !inputValue }">
        <Search :size="20" class="search-icon" />
        <input
          v-model="inputValue"
          placeholder="输入任何计算机相关的术语..."
          @keyup.enter="void handleUnlock()"
          @focus="showSuggestions = true"
          class="search-input"
        />
        <button 
          @click="void handleUnlock()" 
          class="ignite-btn bg-gradient-brand"
          :disabled="!inputValue.trim()"
        >
          <Sparkles :size="20" />
        </button>
      </div>

      <!-- 搜索建议下拉 -->
      <Transition name="dropdown">
        <div v-if="showSuggestions && !inputValue" class="suggestions-dropdown glass-panel">
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
  max-width: 640px;
  position: relative;
  z-index: 200;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 8px 8px 20px;
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
  font-size: 16px;
  color: var(--text-primary);
  outline: none;
  padding: 12px 0;
}

.ignite-btn {
  width: 48px;
  height: 48px;
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

.suggestions-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  left: 0;
  right: 0;
  padding: 20px;
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
.dropdown-enter-active, .dropdown-leave-active { transition: all 0.4s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-10px); }

.feedback-slide-enter-active, .feedback-slide-leave-active { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.feedback-slide-enter-from { transform: translateX(100px); opacity: 0; }
.feedback-slide-leave-to { transform: translateY(-50px); opacity: 0; }
</style>

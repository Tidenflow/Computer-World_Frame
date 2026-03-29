<script setup lang="ts">
import { ref } from 'vue';
import { useMapStore } from '../store/map.store';
import { useProgressStore } from '../store/progress.store';

const mapStore = useMapStore();
const progressStore = useProgressStore();

const inputValue = ref('');
const message = ref<{ text: string; type: 'success' | 'error' } | null>(null);

function handleUnlock() {
  if (!mapStore.frameMap || !inputValue.value.trim()) return;

  const searchLabel = inputValue.value.trim().toLowerCase();
  const matchedNode = mapStore.frameMap.nodes.find(
    node => node.label.toLowerCase() === searchLabel
  );

  if (matchedNode) {
    progressStore.unlockNode(matchedNode).then(result => {
      message.value = { 
        text: result.message, 
        type: result.success ? 'success' : 'error' 
      };
      if (result.success) inputValue.value = '';
      clearMessage();
    });
  } else {
    message.value = { text: `未找到匹配节点: ${inputValue.value}`, type: 'error' };
    clearMessage();
  }
}

function clearMessage() {
  setTimeout(() => {
    message.value = null;
  }, 3000);
}
</script>

<template>
  <div class="search-hud">
    <!-- Message popup -->
    <Transition name="fade">
      <div v-if="message" :class="['message-toast', message.type]">
        {{ message.text }}
      </div>
    </Transition>

    <!-- Search Input Panel -->
    <div class="search-panel glass">
      <div class="input-wrapper">
        <input
          v-model="inputValue"
          placeholder="输入术语以点亮知识节点..."
          @keyup.enter="handleUnlock"
          class="search-input"
        />
        <div class="input-glow"></div>
      </div>
      <button @click="handleUnlock" class="ignite-btn">
        <span class="btn-text">点亮</span>
        <div class="btn-glow"></div>
      </button>
    </div>

    <!-- Legend -->
    <div class="legend-panel glass">
      <div class="legend-item">
        <div class="dot unlocked"></div>
        <span>已解锁</span>
      </div>
      <div class="legend-item">
        <div class="dot discoverable"></div>
        <span>可探索</span>
      </div>
      <div class="legend-item">
        <div class="dot locked"></div>
        <span>未发现</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-hud {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  z-index: 100;
  pointer-events: none;
}

.search-panel, .legend-panel, .message-toast {
  pointer-events: auto;
}

.search-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 8px 8px 24px;
  border-radius: 40px;
  min-width: 480px;
}

.input-wrapper {
  flex: 1;
  position: relative;
}

.search-input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px 0;
  color: var(--text-h);
  font-size: 16px;
  outline: none;
  font-family: var(--sans);
  transition: border-color 0.3s;
}

.search-input:focus {
  border-bottom-color: var(--accent);
}

.ignite-btn {
  position: relative;
  background: var(--accent);
  color: var(--bg);
  border: none;
  padding: 10px 28px;
  border-radius: 30px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.ignite-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 20px var(--accent-glow);
}

.ignite-btn:active {
  transform: scale(0.95);
}

.message-toast {
  padding: 10px 24px;
  border-radius: 20px;
  background: rgba(10, 15, 26, 0.9);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  font-size: 14px;
  font-weight: 500;
}

.message-toast.success { color: var(--success); border-color: var(--success); }
.message-toast.error { color: var(--error); border-color: var(--error); }

.legend-panel {
  display: flex;
  gap: 24px;
  padding: 8px 24px;
  border-radius: 20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.unlocked { background: var(--accent); box-shadow: 0 0 8px var(--accent); }
.dot.discoverable { background: #546e7a; }
.dot.locked { border: 1px solid #37474f; }

/* Animations */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }
</style>

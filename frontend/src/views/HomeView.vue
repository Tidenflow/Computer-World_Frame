<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMapStore } from '../store/map.store';
import { useProgressStore } from '../store/progress.store';
import { useUserStore } from '../store/user.store';

import CWFrameGraph from '../components/CWFrameGraph.vue';
import CWFrameNode from '../components/CWFrameNode.vue';
import CWFSearchHUD from '../components/CWFSearchHUD.vue';
import CWFNodeSidebar from '../components/CWFNodeSidebar.vue';

const mapStore = useMapStore();
const progressStore = useProgressStore();
const userStore = useUserStore();

const errorMessage = ref<string | null>(null);

onMounted(async () => {
  try {
    // Load data via stores instead of local refs
    if (!mapStore.frameMap) {
      await mapStore.loadMap();
    }
    if (!progressStore.isLoaded && userStore.userId) {
      await progressStore.loadProgress();
    }
  } catch (err: any) {
    console.error('Initialization failed:', err);
    errorMessage.value = `同步失败: ${err.message || '网络连接异常，请检查后端服务'}`;
  }
});

function handleRetry() {
  window.location.reload();
}
</script>

<template>
  <div class="home-view">
    <!-- 3D Graph -->
    <CWFrameGraph />

    <!-- 2D Overlays (Only unlocked nodes or discoverable) -->
    <template v-if="mapStore.frameMap">
      <CWFrameNode
        v-for="node in mapStore.frameMap.nodes"
        :key="node.id"
        :node="node"
      />
    </template>

    <!-- UI Overlay HUD -->
    <CWFSearchHUD />

    <!-- Right Sidebar Detail -->
    <CWFNodeSidebar />

    <!-- Initial Loading / Error State -->
    <Transition name="fade">
      <div v-if="!mapStore.frameMap" class="loading-overlay">
        <template v-if="!errorMessage">
          <div class="loader"></div>
          <p>正在同步宇宙知识框架...</p>
        </template>
        <template v-else>
          <div class="error-icon">⚠️</div>
          <p class="error-text">{{ errorMessage }}</p>
          <button @click="handleRetry" class="retry-btn">重试</button>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.home-view {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: var(--bg);
}

.loading-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  z-index: 1000;
  color: var(--accent);
  gap: 20px;
}

.loader {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(79, 195, 247, 0.1);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.error-text {
  color: var(--error);
  font-weight: 500;
  max-width: 300px;
  text-align: center;
}

.retry-btn {
  margin-top: 20px;
  padding: 10px 32px;
  background: transparent;
  border: 1px solid var(--accent);
  color: var(--accent);
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.retry-btn:hover {
  background: var(--accent);
  color: var(--bg);
  box-shadow: 0 0 20px var(--accent-glow);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>

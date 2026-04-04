<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMapStore } from '../store/map.store';
import { useProgressStore } from '../store/progress.store';
import { useUserStore } from '../store/user.store';
import CWFrameGraph from '../components/CWFrameGraph.vue';
import CWFSearchHUD from '../components/CWFSearchHUD.vue';
import CWFNodeSidebar from '../components/CWFNodeSidebar.vue';
import CWFHeader from '../components/CWFHeader.vue';
import CWFHistoryPanel from '../components/CWFHistoryPanel.vue';

const mapStore = useMapStore();
const progressStore = useProgressStore();
const userStore = useUserStore();
const errorMessage = ref<string | null>(null);

onMounted(async (): Promise<void> => {
  try {
    if (!mapStore.frameMap) {
      await mapStore.loadMap();
    }

    if (!progressStore.isLoaded && userStore.userId) {
      await progressStore.loadProgress();
    }
  } catch (err: any) {
    console.error('初始化失败:', err);
    errorMessage.value = `同步失败: ${err.message || '网络连接异常，请检查后端服务'}`;
  }
});
</script>

<template>
  <div class="home-view">
    <CWFHeader />

    <main class="main-content">
      <header class="search-section">
        <CWFSearchHUD />
      </header>

      <div class="app-grid">
        <aside class="sidebar-col custom-scroll">
          <CWFHistoryPanel />

          <div class="legend-box glass-panel">
            <h4 class="legend-title">分类图例 / Categories</h4>
            <div class="legend-items">
              <div class="legend-item"><span class="dot hw"></span> 硬件层 / Hardware</div>
              <div class="legend-item"><span class="dot sw"></span> 软件层 / Software</div>
              <div class="legend-item"><span class="dot th"></span> 理论层 / Theory</div>
              <div class="legend-item"><span class="dot net"></span> 网络层 / Networking</div>
            </div>
          </div>

          <div class="tips-box glass-panel">
            <h4 class="legend-title">使用提示</h4>
            <ul class="tips-list">
              <li>输入相关计算机、工程术语，点亮新的节点</li>
              <li>左侧面板只显示最近一次输入的结果，点击可快速定位</li>
              <li>使用滚轮缩放、拖动平移，观察已揭示的局部结构</li>
            </ul>
          </div>
        </aside>

        <section class="visualization-area">
          <div class="graph-wrapper glass-panel">
            <CWFrameGraph />

            <div class="progress-stats glass-panel">
              <span class="stats-label">已点亮: </span>
              <span class="stats-value">{{ progressStore.unlockedNodesCount }}</span>
              <span class="stats-total"> / {{ mapStore.frameMap?.nodes.length || 0 }}</span>
            </div>
          </div>
        </section>
      </div>
    </main>

    <CWFNodeSidebar />

    <Transition name="fade">
      <div v-if="!mapStore.frameMap" class="loading-screen">
        <div class="loader-ripple"><div></div><div></div></div>
        <p v-if="!errorMessage">正在构造宇宙级知识图谱...</p>
        <p v-else class="error-msg">{{ errorMessage }}</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.home-view {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-dark);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 40px 40px 40px;
}

.search-section {
  padding: 32px 0;
  display: flex;
  justify-content: center;
}

.app-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  min-height: 0;
}

.sidebar-col {
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  padding-right: 8px;
}

.legend-box,
.tips-box {
  padding: 20px;
  border-radius: 16px;
}

.legend-title {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-weak);
  margin-bottom: 16px;
  letter-spacing: 1px;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.legend-item {
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 10px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  opacity: 0.8;
}

.dot.hw { background: #38bdf8; box-shadow: 0 0 10px #38bdf8; }
.dot.sw { background: #a855f7; box-shadow: 0 0 10px #a855f7; }
.dot.th { background: #60a5fa; box-shadow: 0 0 10px #60a5fa; }
.dot.net { background: #0ea5e9; box-shadow: 0 0 10px #0ea5e9; }

.tips-list {
  padding-left: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tips-list li {
  font-size: 11px;
  color: var(--text-weak);
  line-height: 1.5;
}

.visualization-area {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
}

.graph-wrapper {
  width: 100%;
  height: 100%;
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border-slate);
}

.progress-stats {
  position: absolute;
  top: 24px;
  right: 24px;
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stats-label { font-size: 12px; color: var(--text-weak); }
.stats-value { font-size: 18px; color: var(--blue-400); }
.stats-total { font-size: 12px; color: var(--text-weak); }

.loading-screen {
  position: fixed;
  inset: 0;
  background: var(--bg-dark);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  color: var(--text-muted);
}
</style>

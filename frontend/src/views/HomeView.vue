<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import CWFrameGraph from '../components/CWFrameGraph.vue';
import CWFHeader from '../components/CWFHeader.vue';
import CWFHistoryPanel from '../components/CWFHistoryPanel.vue';
import CWFNodeSidebar from '../components/CWFNodeSidebar.vue';
import CWFSearchHUD from '../components/CWFSearchHUD.vue';
import { useMapStore } from '../store/map.store';
import { useProgressStore } from '../store/progress.store';
import { useUserStore } from '../store/user.store';

const mapStore = useMapStore();
const progressStore = useProgressStore();
const userStore = useUserStore();
const errorMessage = ref<string | null>(null);
const isSidebarCollapsed = ref(true);

const profileTitle = computed(() => userStore.username || 'Explorer');
const unlockedRatio = computed(() => {
  const total = mapStore.frameMap?.nodes.length ?? 0;
  return `${progressStore.unlockedNodesCount}/${total}`;
});

function toggleSidebar(): void {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
}

onMounted(async (): Promise<void> => {
  try {
    if (!mapStore.frameMap) {
      await mapStore.loadMap();
    }

    if (!progressStore.isLoaded && userStore.userId) {
      await progressStore.loadProgress();
    }
  } catch (err: any) {
    console.error('Failed to initialize home view:', err);
    errorMessage.value = `Load failed: ${err.message || 'Unknown error'}`;
  }
});
</script>

<template>
  <div class="home-view">
    <CWFHeader />

    <main class="main-content">
      <button
        type="button"
        class="page-panel-toggle"
        :aria-expanded="!isSidebarCollapsed"
        :aria-label="isSidebarCollapsed ? 'Open side panel' : 'Collapse side panel'"
        @click="toggleSidebar"
      >
        <span class="graph-panel-toggle-arrow">{{ isSidebarCollapsed ? '>' : '<' }}</span>
      </button>

      <header class="search-section">
        <CWFSearchHUD />
      </header>

      <div class="app-grid" :class="{ collapsed: isSidebarCollapsed }">
        <aside v-if="!isSidebarCollapsed" class="sidebar-col custom-scroll">
            <div class="profile-brief glass-panel">
              <div class="profile-brief-header">
                <div>
                  <div class="profile-label">Current Explorer</div>
                  <div class="profile-name">{{ profileTitle }}</div>
                </div>
                <router-link to="/profile" class="profile-link">Profile</router-link>
              </div>
              <div class="profile-meta">
                <span>ID #{{ userStore.userId }}</span>
                <span>{{ unlockedRatio }} unlocked</span>
              </div>
            </div>

            <CWFHistoryPanel />

            <div class="legend-box glass-panel">
              <h4 class="legend-title">Node Categories</h4>
              <div class="legend-items">
                <div class="legend-item"><span class="dot hw"></span> Hardware</div>
                <div class="legend-item"><span class="dot sw"></span> Software</div>
                <div class="legend-item"><span class="dot th"></span> Theory</div>
                <div class="legend-item"><span class="dot net"></span> Networking</div>
              </div>
            </div>

            <div class="tips-box glass-panel">
              <h4 class="legend-title">Tips</h4>
              <ul class="tips-list">
                <li>Use the search panel to light up concepts you just mentioned.</li>
                <li>Click an unlocked node when you want to read its detail instead of interrupting the graph flow.</li>
                <li>Use the latest result list to relocate the nodes unlocked by your most recent input.</li>
              </ul>
            </div>
        </aside>

        <section class="visualization-area">
          <div class="graph-wrapper glass-panel">
            <CWFrameGraph />

            <div class="progress-stats glass-panel">
              <span class="stats-label">Unlocked</span>
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
        <p v-if="!errorMessage">Loading map...</p>
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
  padding: 0 32px 28px 32px;
  position: relative;
}

.search-section {
  padding: 12px 0 16px 0;
  display: flex;
  justify-content: center;
}

.page-panel-toggle {
  position: absolute;
  top: 14px;
  left: 32px;
  z-index: 4;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.82);
  color: var(--text-primary);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: var(--transition-smooth);
  backdrop-filter: blur(10px);
}

.page-panel-toggle:hover {
  border-color: var(--border-highlight);
  background: rgba(30, 41, 59, 0.94);
  transform: scale(1.04);
}

.app-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 20px;
  min-height: 0;
}

.app-grid.collapsed {
  grid-template-columns: minmax(0, 1fr);
}

.sidebar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  padding-right: 8px;
}

.legend-box,
.tips-box,
.profile-brief {
  padding: 20px;
  border-radius: 16px;
}

.profile-brief {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-brief-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.profile-label {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-weak);
  letter-spacing: 1px;
}

.profile-name {
  margin-top: 6px;
  font-size: 18px;
  font-weight: 800;
  color: var(--text-primary);
}

.profile-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.profile-link {
  color: var(--blue-400);
  text-decoration: none;
  font-size: 12px;
  font-weight: 700;
}

.profile-link:hover {
  text-decoration: underline;
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
  min-width: 0;
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

.graph-panel-toggle-arrow {
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
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

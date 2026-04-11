<!-- 首页视图组件 -->
<script setup lang="ts">
// 当你的 .vue 组件页面显示出来之后，Vue 会自动调用 onMounted 里面的代码
import { ref, onMounted } from 'vue';  // onMounted = 组件一渲染完，立刻自动执行的函数
import { useMapStore } from '../store/map.store';
import { useProgressStore } from '../store/progress.store';
import { useUserStore } from '../store/user.store';

// 所有 .vue 单文件组件，默认都会被 Vue 自动导出！
// 你不用自己写 export，它也能被 import！
import CWFrameGraph from '../components/CWFrameGraph.vue';
import CWFSearchHUD from '../components/CWFSearchHUD.vue';
import CWFNodeSidebar from '../components/CWFNodeSidebar.vue';
import CWFHeader from '../components/CWFHeader.vue';
import CWFHistoryPanel from '../components/CWFHistoryPanel.vue';

// 这里就是获取 store 里面的数据
const mapStore = useMapStore();
const progressStore = useProgressStore();
const userStore = useUserStore();

// 这里的errorMessage就是用来显示错误信息的
const errorMessage = ref<string | null>(null);  // ref = 创建一个响应式变量

/**
 * 页面挂载后初始化数据：
 * - 地图未加载则先加载地图
 * - 进度未加载则拉取当前用户进度
 *
 * @returns Promise<void>
 *
 * @sideEffects
 * - 会触发 `mapStore.loadMap()`、`progressStore.loadProgress()` 的网络请求
 * - 初始化失败时会写入 `errorMessage`，以便渲染错误提示
 */
onMounted(async (): Promise<void> => {
  try {
    if (!mapStore.frameMap) {   // 如果mapStore.frameMap为空，则调用mapStore.loadMap()
      await mapStore.loadMap();   // 加载地图数据 一般初次加载的时候会为空，所以会调用loadMap()
    }
    if (!progressStore.isLoaded && userStore.userId) {   // 如果progressStore.isLoaded为false，并且userStore.userId不为空，则调用progressStore.loadProgress()
      await progressStore.loadProgress();   // 加载进度数据 一般初次加载的时候会为空，所以会调用loadProgress()
    }
  } catch (err: any) {
    console.error('初始化失败:', err);   // 如果加载失败，则显示错误信息
    errorMessage.value = `同步失败: ${err.message || '网络连接异常，请检查后端服务'}`;   
  }
});
</script>

<template>
  <div class="home-view">
    <CWFHeader />

    <main class="main-content">
      <!-- 搜索栏区域 -->
      <header class="search-section">
        <CWFSearchHUD />
      </header>

      <div class="app-grid">
        <!-- 侧边栏列 (历史记录与图例) -->
        <aside class="sidebar-col custom-scroll">
          <CWFHistoryPanel/>
          <!-- 下面这个是用来调试的，不要删掉 -->
          <!-- <CWFHistoryPanel style="border: 3px solid red;" /> -->
          
          <!-- 分类图例面板 -->
          <div class="legend-box glass-panel">
            <h4 class="legend-title">分类图例 / Categories</h4>
            <div class="legend-items">
              <div class="legend-item"><span class="dot fundamentals"></span> 基础层 / Fundamentals</div>
              <div class="legend-item"><span class="dot hardware"></span> 硬件层 / Hardware</div>
              <div class="legend-item"><span class="dot os"></span> 系统层 / Operating Systems</div>
              <div class="legend-item"><span class="dot network"></span> 网络层 / Networking</div>
              <div class="legend-item"><span class="dot programming"></span> 编程层 / Programming</div>
              <div class="legend-item"><span class="dot data"></span> 数据层 / Data</div>
              <div class="legend-item"><span class="dot application"></span> 应用层 / Application</div>
            </div>
          </div>

          <!-- 使用提示面板 -->
          <div class="tips-box glass-panel">
            <h4 class="legend-title">💡 使用提示</h4>
            <ul class="tips-list">
              <li>输入相关计算机、工程术语点亮图表</li>
              <li>点击已点亮节点（或可探索节点）查看深度解析</li>
              <li>使用鼠标滚轮缩放图表内容</li>
            </ul>
          </div>
        </aside>

        <!-- 2D SVG 图谱可视化区域 -->
        <section class="visualization-area">
          <div class="graph-wrapper glass-panel">
            <CWFrameGraph />
            
            <!-- 进度统计浮层 -->
            <div class="progress-stats glass-panel">
              <span class="stats-label">已点亮: </span>
              <span class="stats-value">{{ progressStore.unlockedNodesCount }}</span>
              <span class="stats-total"> / {{ mapStore.frameMap?.document.nodes.length || 0 }}</span>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- 节点详情 Modal -->
    <CWFNodeSidebar />

    <!-- 全屏加载/错误状态 -->
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

  /* 这个是用来调试的，不要删掉 */
  /* border: 3px solid red;     */
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 40px 40px 40px;
  /* border: 3px solid red;    */
}

.search-section {
  padding: 32px 0;
  display: flex;
  justify-content: center;
  /* border: 3px solid red;    */
}

.app-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  min-height: 0;
  /* border: 3px solid red; */
}

.sidebar-col {
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  padding-right: 8px;
  /* border: 3px solid red; */
}

.legend-box, .tips-box {
  padding: 20px;
  border-radius: 16px;
  /* border: 3px solid red; */
}

.legend-title {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-weak);
  margin-bottom: 16px;
  letter-spacing: 1px;
  /* border: 3px solid red; */
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* border: 3px solid red; */
}

.legend-item {
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 10px;
  /* border: 3px solid red; */
}

.dot { width: 8px; height: 8px; border-radius: 50%; opacity: 0.8; }
.dot.fundamentals { background: #60a5fa; box-shadow: 0 0 10px #60a5fa; }
.dot.hardware { background: #38bdf8; box-shadow: 0 0 10px #38bdf8; }
.dot.os { background: #a855f7; box-shadow: 0 0 10px #a855f7; }
.dot.network { background: #0ea5e9; box-shadow: 0 0 10px #0ea5e9; }
.dot.programming { background: #22c55e; box-shadow: 0 0 10px #22c55e; }
.dot.data { background: #f59e0b; box-shadow: 0 0 10px #f59e0b; }
.dot.application { background: #f43f5e; box-shadow: 0 0 10px #f43f5e; }

.tips-list {
  padding-left: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* border: 3px solid red; */
}

.tips-list li {
  font-size: 11px;
  color: var(--text-weak);
  line-height: 1.5;
  /* border: 3px solid red; */
}

.visualization-area { position: relative; border-radius: 24px; overflow: hidden; }

.graph-wrapper {
  width: 100%;
  height: 100%;
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border-slate);
  /* border: 3px solid red; */
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
  /* border: 3px solid red; */
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
  /* border: 3px solid red; */
}
</style>

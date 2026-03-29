<script setup lang="ts">
import { computed } from 'vue';
import { useMapStore } from '../store/map.store';

const mapStore = useMapStore();
const node = computed(() => mapStore.selectedNode);

function handleClose() {
  mapStore.selectNode(null);
}

function handleSparkAI() {
  alert(`Spark AI: 正在生成关于 "${node.value?.label}" 的深度工业应用分析...`);
  // Future implementation: Call AI service
}
</script>

<template>
  <Transition name="slide">
    <div v-if="node" class="node-sidebar glass">
      <button @click="handleClose" class="close-btn">×</button>
      
      <header class="sidebar-header">
        <span class="category-tag">{{ node.category }}</span>
        <h2 class="node-title text-accent">{{ node.label }}</h2>
        <div class="title-underline"></div>
      </header>

      <section class="sidebar-content">
        <div class="info-group">
          <h3>核心定义</h3>
          <p class="description">{{ node.description }}</p>
        </div>

        <div class="info-group" v-if="node.dependencies.length > 0">
          <h3>前置依赖</h3>
          <div class="tags-row">
            <span v-for="depId in node.dependencies" :key="depId" class="dep-tag">
              #{{ depId }}
            </span>
          </div>
        </div>

        <div class="info-group">
          <h3>为什么重要？</h3>
          <p class="utility-text">
            这是构建计算机世界观的关键基石。理解它能帮助你打通从底层硬件到高层抽象的认知链路。
          </p>
        </div>
      </section>

      <footer class="sidebar-footer">
        <button @click="handleSparkAI" class="spark-ai-btn">
          <span class="spark-icon">✨</span>
          <span class="spark-text">Spark AI 深度解读</span>
          <div class="spark-glow"></div>
        </button>
      </footer>
    </div>
  </Transition>
</template>

<style scoped>
.node-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 420px;
  height: 100vh;
  z-index: 200;
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  border-left: 1px solid var(--border);
  box-shadow: -20px 0 50px rgba(0, 0, 0, 0.5);
}

.close-btn {
  position: absolute;
  top: 20px;
  left: 20px;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 32px;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s;
}

.close-btn:hover {
  color: var(--accent);
}

.category-tag {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--accent);
  letter-spacing: 2px;
  font-weight: 700;
  border-bottom: 1px solid var(--border);
  padding-bottom: 4px;
}

.node-title {
  margin-top: 12px;
  font-size: 36px;
  line-height: 1.1;
}

.title-underline {
  width: 60px;
  height: 4px;
  background: var(--accent);
  margin-top: 16px;
  border-radius: 2px;
}

.sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 32px;
  overflow-y: auto;
}

h3 {
  font-size: 14px;
  margin-bottom: 12px;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.description {
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-h);
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dep-tag {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.utility-text {
  font-size: 14px;
  font-style: italic;
  opacity: 0.7;
}

.sidebar-footer {
  padding-top: 20px;
}

.spark-ai-btn {
  width: 100%;
  position: relative;
  background: rgba(79, 195, 247, 0.1);
  border: 1px solid var(--accent);
  color: var(--accent);
  padding: 18px;
  border-radius: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  animation: pulse-glow 3s infinite;
}

.spark-ai-btn:hover {
  background: var(--accent);
  color: var(--bg);
  transform: translateY(-4px);
  box-shadow: 0 10px 30px var(--accent-glow);
}

.spark-icon { font-size: 20px; }

/* Slide Transition */
.slide-enter-active, .slide-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-enter-from { transform: translateX(100%); opacity: 0; }
.slide-leave-to { transform: translateX(100%); opacity: 0; }
</style>

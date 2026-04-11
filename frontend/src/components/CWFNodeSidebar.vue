<script setup lang="ts">
import { computed } from 'vue';
import { BookOpen, Lightbulb, Sparkles, Target, X, Zap } from 'lucide-vue-next';
import { useMapStore } from '../store/map.store';

const mapStore = useMapStore();
const node = computed(() => mapStore.selectedNode);

function handleClose(): void {
  mapStore.selectNode(null);
}

// Mock deep dive until contract supports it
const deepDive = {
  overview: 'This panel stays focused on the selected concept itself, so the detail view does not turn into a side-channel for graph navigation.',
  keyPoints: [
    'Read the node description first to understand what this concept represents in the current map.',
    'Use the graph itself when you want to explore spatial relationships between concepts.',
    'Keep the sidebar focused on understanding, not on unlocking or redirecting the user.',
  ],
  learningPath: ['Read', 'Relate', 'Reflect', 'Return To Graph'],
};

function handleSparkAI(): void {
  alert(`Spark AI: preparing an extended explanation for "${node.value?.title}"...`);
}
</script>

<template>
  <Transition name="modal-bounce">
    <div v-if="node" class="modal-wrapper" @click="handleClose">
      <div class="modal-card glass-panel" @click.stop>
        <header class="modal-head">
          <div class="head-top">
            <div class="category-chip" :class="node.domain">
              <div class="chip-dot"></div>
              <span>{{ node.domain.toUpperCase() }}</span>
            </div>
            <button @click="handleClose" class="icon-close"><X :size="20" /></button>
          </div>
          <h2 class="node-title">{{ node.title }}</h2>
          <p class="node-desc">{{ (node as any).description || 'No description available' }}</p>
          <div class="divider"></div>
        </header>

        <div class="modal-body custom-scroll">
          <div class="section-group">
            <div class="tag-title">Aliases</div>
            <div class="alias-chips">
              <span class="chip-item">#{{ node.title }}</span>
              <span class="chip-item">#concept</span>
            </div>
          </div>

          <div class="deep-dive-box">
            <div class="deep-dive-head">
              <Sparkles :size="18" class="icon-spark" />
              <span>Deep Dive</span>
            </div>

            <div class="dive-content">
              <div class="dive-section">
                <div class="dive-label"><Target :size="12" /> Overview</div>
                <p class="dive-text">{{ deepDive.overview }}</p>
              </div>

              <div class="dive-section">
                <div class="dive-label"><Zap :size="12" /> Key Points</div>
                <ul class="dive-list">
                  <li v-for="(point, i) in deepDive.keyPoints" :key="i">
                    {{ point }}
                  </li>
                </ul>
              </div>

              <div class="dive-section">
                <div class="dive-label"><BookOpen :size="12" /> Learning Path</div>
                <div class="path-steps">
                  <span v-for="(step, i) in deepDive.learningPath" :key="i" class="path-step">
                    {{ i + 1 }}. {{ step }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="modal-foot">
          <button class="ai-spark-btn bg-gradient-brand shadow-glow" @click="handleSparkAI">
            <Sparkles :size="18" />
            <span>Ask Spark AI</span>
          </button>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-wrapper {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.75);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 620px;
  max-height: 85vh;
  border-radius: 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 40px 120px rgba(0, 0, 0, 0.8), 0 0 0 1px var(--border-slate);
}

.modal-head {
  padding: 32px 32px 16px 32px;
  background: linear-gradient(to right, rgba(255, 255, 255, 0.03), transparent);
}

.head-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.category-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: var(--border-slate);
  border: 1px solid var(--border-highlight);
  border-radius: 20px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--text-weak);
}

.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background: currentColor;
}

.icon-close {
  background: transparent;
  border: none;
  color: var(--text-weak);
  cursor: pointer;
  transition: var(--transition-smooth);
}

.icon-close:hover {
  color: var(--text-primary);
  transform: rotate(90deg);
}

.node-title {
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.node-desc {
  font-size: 15px;
  color: var(--text-muted);
  line-height: 1.6;
}

.divider {
  height: 1px;
  background: var(--border-slate);
  margin-top: 24px;
}

.modal-body {
  padding: 0 32px 32px 32px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.section-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tag-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-weak);
  text-transform: uppercase;
}

.alias-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip-item {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-card);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-slate);
}

.deep-dive-box {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(8, 145, 178, 0.08));
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: 16px;
  padding: 24px;
}

.deep-dive-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 800;
  color: var(--sky-400);
  margin-bottom: 20px;
}

.dive-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dive-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dive-label {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-weak);
  display: flex;
  align-items: center;
  gap: 6px;
}

.dive-text {
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.6;
}

.dive-list {
  padding-left: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dive-list li {
  font-size: 13px;
  color: var(--text-secondary);
  opacity: 0.9;
}

.path-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.path-step {
  font-size: 11px;
  background: rgba(37, 99, 235, 0.15);
  color: var(--sky-400);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(37, 99, 235, 0.2);
}

.modal-foot {
  padding: 24px 32px 32px 32px;
  border-top: 1px solid var(--border-slate);
}

.ai-spark-btn {
  width: 100%;
  padding: 16px;
  border-radius: 14px;
  border: none;
  color: white;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.shadow-glow {
  box-shadow: 0 4px 20px rgba(37, 99, 235, 0.4);
}

.ai-spark-btn:hover {
  transform: translateY(-3px);
  filter: brightness(1.1);
  box-shadow: 0 8px 30px rgba(37, 99, 235, 0.5);
}

.modal-bounce-enter-active,
.modal-bounce-leave-active {
  transition: opacity 0.4s ease;
}

.modal-bounce-enter-from,
.modal-bounce-leave-to {
  opacity: 0;
}

.modal-bounce-enter-active .modal-card {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-bounce-enter-from .modal-card {
  transform: scale(0.8) translateY(40px);
}
</style>

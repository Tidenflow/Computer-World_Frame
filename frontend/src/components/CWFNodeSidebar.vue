<script setup lang="ts">
import { computed } from 'vue';
import { useMapStore } from '../store/map.store';
import { X, BookOpen, ArrowRight, Lightbulb, Sparkles, Target, Zap } from 'lucide-vue-next';

const mapStore = useMapStore();
const node = computed(() => mapStore.selectedNode);

/**
 * 关闭节点详情弹窗。
 *
 * @returns void
 * @sideEffects 会调用 `mapStore.selectNode(null)` 清空选中节点，导致弹窗消失
 */
function handleClose(): void {
  mapStore.selectNode(null);
}

/**
 * 前置知识（依赖节点）列表。
 *
 * 当当前节点存在且地图已加载时，把 `node.dependencies` 映射为具体节点对象。
 *
 * @returns 前置节点数组（不包含 null）
 */
const getPrerequisites = computed(() => {
  if (!node.value || !mapStore.frameMap) return [];
  return node.value.dependencies
    .map(id => mapStore.frameMap?.nodes.find(n => n.id === id))
    .filter(Boolean);
});

// Mock deep dive until contract supports it
const deepDive = {
  overview: '这是该领域的关键基石，在整个计算机科学体系中占据着承上启下的核心地位。',
  keyPoints: [
    '理解底层运行机制对性能优化的影响',
    '掌握主流工业界的最佳实践与标准',
    '建立从抽象到底层的全链路思考能力'
  ],
  learningPath: ['基础概念', '核心架构', '性能调优', '工程实践']
};

/**
 * 点击“Spark AI 深度解读”按钮（当前为 mock 行为）。
 *
 * @returns void
 * @sideEffects 会弹出浏览器 alert
 */
function handleSparkAI(): void {
  alert(`Spark AI: 正在生成关于 "${node.value?.label}" 的深度工业应用分析...`);
}
</script>

<template>
  <Transition name="modal-bounce">
    <div v-if="node" class="modal-wrapper" @click="handleClose">
      <div class="modal-card glass-panel" @click.stop>
        
        <!-- Header Section -->
        <header class="modal-head">
          <div class="head-top">
            <div class="category-chip" :class="node.category">
              <div class="chip-dot"></div>
              <span>{{ node.category.toUpperCase() }}</span>
            </div>
            <button @click="handleClose" class="icon-close"><X :size="20" /></button>
          </div>
          <h2 class="node-title">{{ node.label }}</h2>
          <p class="node-desc">{{ node.description }}</p>
          <div class="divider"></div>
        </header>

        <!-- Scrollable Content -->
        <div class="modal-body custom-scroll">
          
          <!-- Quick Meta (Aliases mock) -->
          <div class="section-group">
            <div class="tag-title">别名 / Aliases</div>
            <div class="alias-chips">
              <span class="chip-item">#{{ node.label }}</span>
              <span class="chip-item">#核心概念</span>
            </div>
          </div>

          <!-- Dependencies -->
          <div class="section-group" v-if="getPrerequisites.length > 0">
            <div class="section-header">
              <BookOpen :size="16" class="icon-blue" />
              <span>前置知识 / Prerequisites</span>
            </div>
            <div class="nav-list">
              <button 
                v-for="pre in getPrerequisites" 
                :key="pre.id"
                class="nav-item"
                @click="mapStore.selectNode(pre.id)"
              >
                <span>{{ pre.label }}</span>
                <ArrowRight :size="14" class="icon-weak" />
              </button>
            </div>
          </div>

          <!-- Deep Dive (Clone of NodeDetailPanel.tsx) -->
          <div class="deep-dive-box">
            <div class="deep-dive-head">
              <Sparkles :size="18" class="icon-spark" />
              <span>深度探索 🚀</span>
            </div>
            
            <div class="dive-content">
              <div class="dive-section">
                <div class="dive-label"><Target :size="12" /> 概述</div>
                <p class="dive-text">{{ deepDive.overview }}</p>
              </div>

              <div class="dive-section">
                <div class="dive-label"><Zap :size="12" /> 关键知识点</div>
                <ul class="dive-list">
                  <li v-for="(point, i) in deepDive.keyPoints" :key="i">
                    {{ point }}
                  </li>
                </ul>
              </div>

              <div class="dive-section">
                <div class="dive-label"><BookOpen :size="12" /> 学习路线建议</div>
                <div class="path-steps">
                  <span v-for="(step, i) in deepDive.learningPath" :key="i" class="path-step">
                    {{ i + 1 }}. {{ step }}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Footer Action -->
        <footer class="modal-foot">
          <button class="ai-spark-btn bg-gradient-brand shadow-glow" @click="handleSparkAI">
            <Sparkles :size="18" />
            <span>获取 Spark AI 深度解读</span>
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

.chip-dot { width: 6px; height: 6px; border-radius: 3px; background: currentColor; }

.icon-close {
  background: transparent;
  border: none;
  color: var(--text-weak);
  cursor: pointer;
  transition: var(--transition-smooth);
}

.icon-close:hover { color: var(--text-primary); transform: rotate(90deg); }

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

.section-group { display: flex; flex-direction: column; gap: 12px; }

.tag-title { font-size: 12px; font-weight: 700; color: var(--text-weak); text-transform: uppercase; }

.alias-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip-item { font-size: 12px; color: var(--text-muted); background: var(--bg-card); padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-slate); }

.section-header { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 800; color: var(--text-secondary); }
.icon-blue { color: var(--blue-400); }

.nav-list { display: flex; flex-direction: column; gap: 8px; }
.nav-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-slate);
  border-radius: 12px;
  cursor: pointer;
  transition: var(--transition-smooth);
  color: var(--text-secondary);
}
.nav-item:hover { background: var(--bg-card); border-color: var(--blue-400); transform: translateX(4px); }

/* Deep Dive Box (The Core Clone) */
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

.dive-content { display: flex; flex-direction: column; gap: 20px; }
.dive-section { display: flex; flex-direction: column; gap: 8px; }
.dive-label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-weak); display: flex; align-items: center; gap: 6px; }
.dive-text { font-size: 14px; color: var(--text-muted); line-height: 1.6; }

.dive-list { padding-left: 14px; display: flex; flex-direction: column; gap: 6px; }
.dive-list li { font-size: 13px; color: var(--text-secondary); opacity: 0.9; }

.path-steps { display: flex; flex-wrap: wrap; gap: 8px; }
.path-step {
  font-size: 11px;
  background: rgba(37, 99, 235, 0.15);
  color: var(--sky-400);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(37, 99, 235, 0.2);
}

.modal-foot { padding: 24px 32px 32px 32px; border-top: 1px solid var(--border-slate); }

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

.shadow-glow { box-shadow: 0 4px 20px rgba(37, 99, 235, 0.4); }
.ai-spark-btn:hover { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 8px 30px rgba(37, 99, 235, 0.5); }

/* Transitions */
.modal-bounce-enter-active, .modal-bounce-leave-active { transition: opacity 0.4s ease; }
.modal-bounce-enter-from, .modal-bounce-leave-to { opacity: 0; }

.modal-bounce-enter-active .modal-card { transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-bounce-enter-from .modal-card { transform: scale(0.8) translateY(40px); }
</style>

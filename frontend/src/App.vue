<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import type { CWFrameMap, CWFrameProgress } from '@shared/contract';
import { loadFrameMap, loadProgress } from './core/cwframe.loader';
import { unlockNode, resetProgress } from './core/cwframe.progress';
import { buildStatusMap } from './core/cwframe.status';
import CWFrameGraph from './components/CWFrameGraph.vue';
import CWFrameNode from './components/CWFrameNode.vue';

const frameMap = ref<CWFrameMap | null>(null);
const progress = reactive<CWFrameProgress>({ userId: 1, unlockedNodes: {} });

// 3D -> 2D screen positions for each node
const nodePositions = ref<Map<number, { screenX: number; screenY: number }>>(new Map());

// Currently selected node (clicked)
const selectedNodeId = ref<number | null>(null);

const inputValue = ref('');
const matchResult = ref<{ success: boolean; message: string } | null>(null);

// Compute status map from frameMap + progress
const statusMap = computed(() => {
  if (!frameMap.value) return {};
  return buildStatusMap(frameMap.value, progress);
});

onMounted(async () => {
  const map = await loadFrameMap();
  const prog = await loadProgress();
  frameMap.value = map;
  Object.assign(progress, prog);
});

function handleInputUnlock() {
  if (!frameMap.value || !inputValue.value.trim()) return;

  const searchLabel = inputValue.value.trim().toLowerCase();
  const matchedNode = frameMap.value.nodes.find(
    node => node.label.toLowerCase() === searchLabel
  );

  if (matchedNode) {
    unlockNode(progress, matchedNode);
    matchResult.value = {
      success: true,
      message: `已解锁: ${matchedNode.label}`
    };
  } else {
    matchResult.value = {
      success: false,
      message: `未找到匹配节点: ${inputValue.value}`
    };
  }

  inputValue.value = '';

  setTimeout(() => {
    matchResult.value = null;
  }, 2000);
}

function handleReset() {
  selectedNodeId.value = null;
  resetProgress(progress);
}

// Receive 2D screen positions from Three.js canvas every frame
function handlePositionsUpdate(positions: Map<number, { screenX: number; screenY: number }>) {
  nodePositions.value = positions;
}

// Toggle node selection on click
function handleNodeClick(nodeId: number) {
  selectedNodeId.value = selectedNodeId.value === nodeId ? null : nodeId;
}

function handleNodeOverlayClick(nodeId: number) {
  handleNodeClick(nodeId);
}
</script>

<template>
  <div class="app-container">
    <!-- Three.js graph canvas -->
    <CWFrameGraph
      v-if="frameMap"
      :frameMap="frameMap"
      :progress="progress"
      @node-click="handleNodeClick"
      @positions-update="handlePositionsUpdate"
    />

    <!-- Vue node overlays (labels rendered as DOM) -->
    <template v-if="frameMap">
      <CWFrameNode
        v-for="node in frameMap.nodes"
        :key="node.id"
        :node="node"
        :status="(statusMap[node.id] ?? 'Locked')"
        :screenX="nodePositions.get(node.id)?.screenX ?? 0"
        :screenY="nodePositions.get(node.id)?.screenY ?? 0"
        :selected="selectedNodeId === node.id"
        @click="handleNodeOverlayClick"
      />
    </template>

    <!-- Loading state -->
    <div v-if="!frameMap" class="loading">
      Loading...
    </div>

    <!-- Input panel -->
    <div class="input-panel">
      <div class="search-box">
        <input
          v-model="inputValue"
          placeholder="输入词汇点亮节点..."
          @keyup.enter="handleInputUnlock"
          class="search-input"
        />
        <button @click="handleInputUnlock" class="search-btn">
          点亮
        </button>
      </div>

      <div v-if="matchResult" :class="['result', matchResult.success ? 'success' : 'error']">
        {{ matchResult.message }}
      </div>

      <button @click="handleReset" class="reset-btn">
        重置进度
      </button>

      <div class="legend">
        <span class="legend-item"><span class="dot unlocked"></span> 已解锁</span>
        <span class="legend-item"><span class="dot discoverable"></span> 可探索</span>
        <span class="legend-item"><span class="dot locked"></span> 未发现</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #4fc3f7;
  font-size: 18px;
}

.input-panel {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 100;
}

.search-box {
  display: flex;
  gap: 10px;
  background: rgba(10, 15, 30, 0.9);
  padding: 12px 20px;
  border-radius: 30px;
  border: 1px solid #4fc3f7;
  box-shadow: 0 0 30px rgba(79, 195, 247, 0.3);
}

.search-input {
  width: 250px;
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 14px;
  outline: none;
}

.search-input::placeholder {
  color: #546e7a;
}

.search-btn {
  padding: 8px 20px;
  background: #4fc3f7;
  border: none;
  border-radius: 20px;
  color: #0a0a0f;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.search-btn:hover {
  background: #81d4fa;
  box-shadow: 0 0 15px #4fc3f7;
}

.result {
  font-size: 14px;
  padding: 8px 16px;
  border-radius: 20px;
  animation: fadeIn 0.3s ease;
}

.result.success {
  color: #4fc3f7;
  background: rgba(79, 195, 247, 0.1);
}

.result.error {
  color: #ef5350;
  background: rgba(239, 83, 80, 0.1);
}

.reset-btn {
  padding: 6px 16px;
  background: transparent;
  border: 1px solid #546e7a;
  border-radius: 15px;
  color: #546e7a;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.reset-btn:hover {
  border-color: #ef5350;
  color: #ef5350;
}

.legend {
  display: flex;
  gap: 20px;
  font-size: 12px;
  color: #78909c;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.unlocked {
  background: #4fc3f7;
  box-shadow: 0 0 8px #4fc3f7;
}

.dot.discoverable {
  background: #546e7a;
}

.dot.locked {
  background: transparent;
  border: 1px solid #37474f;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

<script setup lang="ts">
import { ref } from 'vue';
import type { CWFrameNode } from '@shared/contract';
import CWFrameLabel from './CWFrameLabel.vue';

interface Props {
  node: CWFrameNode;
  status: 'Unlocked' | 'Discoverable' | 'Locked';
  screenX: number;
  screenY: number;
  selected?: boolean;
}

interface Emits {
  (e: 'click', nodeId: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
});
const emit = defineEmits<Emits>();

const showLabel = ref(false);

function handleClick() {
  if (props.status === 'Unlocked') {
    showLabel.value = !showLabel.value;
    emit('click', props.node.id);
  }
}

function handleMouseEnter() {
  if (props.status === 'Unlocked') {
    showLabel.value = true;
  }
}

function handleMouseLeave() {
  showLabel.value = false;
}
</script>

<template>
  <div
    class="node-overlay"
    :class="[status.toLowerCase(), { selected }]"
    :style="{ left: screenX + 'px', top: screenY + 'px' }"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Glowing sphere visual -->
    <div class="node-sphere">
      <div class="node-glow"></div>
    </div>

    <!-- Label text -->
    <span class="node-text">{{ node.label }}</span>

    <!-- Detail popup -->
    <div v-if="status === 'Unlocked' && showLabel" class="node-popup">
      <CWFrameLabel :node="node" />
    </div>
  </div>
</template>

<style scoped>
.node-overlay {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  z-index: 10;
  transition: opacity 0.3s ease;
}

/* Sphere + glow visual */
.node-sphere {
  position: relative;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.node-glow {
  position: absolute;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(79, 195, 247, 0.6) 0%, rgba(79, 195, 247, 0.2) 40%, transparent 70%);
  filter: blur(2px);
}

/* Label text */
.node-text {
  margin-top: 6px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  pointer-events: none;
}

/* Popup */
.node-popup {
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  animation: fadeIn 0.2s ease;
}

/* Unlocked */
.node-overlay.unlocked .node-sphere {
  background: rgba(79, 195, 247, 0.2);
  border-radius: 50%;
  border: 2px solid #4fc3f7;
  box-shadow: 0 0 10px #4fc3f7, 0 0 20px #4fc3f7;
}

.node-overlay.unlocked .node-text {
  color: #4fc3f7;
  text-shadow: 0 0 8px #4fc3f7;
}

/* Discoverable */
.node-overlay.discoverable .node-sphere {
  background: rgba(84, 110, 122, 0.1);
  border-radius: 50%;
  border: 1px solid #546e7a;
}

.node-overlay.discoverable .node-text {
  color: #546e7a;
  font-size: 11px;
  opacity: 0.5;
  filter: blur(1px);
}

.node-overlay.discoverable .node-glow {
  display: none;
}

/* Locked */
.node-overlay.locked {
  opacity: 0;
  pointer-events: none;
}

/* Selected */
.node-overlay.selected .node-sphere {
  box-shadow: 0 0 15px #4fc3f7, 0 0 30px #4fc3f7;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-5px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>

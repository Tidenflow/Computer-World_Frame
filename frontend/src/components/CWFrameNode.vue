<script setup lang="ts">
import type { CWFrameNode } from '@shared/contract';

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

function handleClick() {
  if (props.status === 'Unlocked') {
    emit('click', props.node.id);
  }
}
</script>

<template>
  <div
    class="node-overlay"
    :class="[status.toLowerCase(), { selected }]"
    :style="{ left: screenX + 'px', top: screenY + 'px' }"
    @click="handleClick"
  >
    <!-- Glowing sphere visual -->
    <div class="node-sphere">
      <div class="node-glow"></div>
    </div>

    <!-- Label text -->
    <span class="node-text">{{ node.label }}</span>
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

/* Discoverable - dim circle, no text */
.node-overlay.discoverable .node-sphere {
  background: rgba(84, 110, 122, 0.15);
  border-radius: 50%;
  border: 1px solid #37474f;
}

.node-overlay.discoverable .node-text {
  display: none;
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
</style>

<script setup lang="ts">
import { computed } from 'vue';
import type { CWFrameNode } from '@shared/contract';
import { useMapStore } from '../store/map.store';

interface Props {
  node: CWFrameNode;
}

const props = defineProps<Props>();
const mapStore = useMapStore();

const status = computed(() => mapStore.statusMap[props.node.id] ?? 'Locked');
const selected = computed(() => mapStore.selectedNodeId === props.node.id);
const pos = computed(() => mapStore.nodeScreenPositions.get(props.node.id) ?? { screenX: 0, screenY: 0 });

function handleClick() {
  if (status.value === 'Unlocked') {
    mapStore.selectNode(props.node.id);
  }
}
</script>

<template>
  <div
    class="node-overlay"
    :class="[status.toLowerCase(), { selected }]"
    :style="{ left: pos.screenX + 'px', top: pos.screenY + 'px' }"
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
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.node-glow {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(79, 195, 247, 0.4) 0%, rgba(79, 195, 247, 0.15) 45%, transparent 75%);
  filter: blur(1px);
}

/* Label text */
.node-text {
  margin-top: 7px;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid rgba(166, 189, 214, 0.25);
  background: rgba(6, 12, 24, 0.68);
  color: #e8f1ff;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.85);
  pointer-events: none;
}

/* Unlocked */
.node-overlay.unlocked .node-sphere {
  background: rgba(79, 195, 247, 0.16);
  border-radius: 50%;
  border: 2px solid #57caf8;
  box-shadow: 0 0 8px rgba(79, 195, 247, 0.65), 0 0 14px rgba(79, 195, 247, 0.4);
}

.node-overlay.unlocked .node-text {
  color: #eaf4ff;
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
  box-shadow: 0 0 12px rgba(79, 195, 247, 0.8), 0 0 20px rgba(79, 195, 247, 0.55);
}
</style>

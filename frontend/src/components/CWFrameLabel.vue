<script setup lang="ts">
import type { CWFrameNode } from '@shared/contract';

interface Props {
  node: CWFrameNode;
}

defineProps<Props>();
</script>

<template>
  <div class="cwframe-label">
    <h3 class="label-title">{{ node.label }}</h3>
    <p class="label-desc">{{ node.description }}</p>
    <span class="label-category">{{ node.category }}</span>
  </div>
</template>

<style scoped>
.cwframe-label {
  background: rgba(10, 15, 30, 0.95);
  border: 1px solid #4fc3f7;
  border-radius: 8px;
  padding: 12px;
  min-width: 150px;
  box-shadow: 0 0 20px rgba(79, 195, 247, 0.3);
  pointer-events: auto;
}

.label-title {
  margin: 0 0 8px 0;
  color: #4fc3f7;
  font-size: 14px;
  font-weight: 600;
}

.label-desc {
  margin: 0 0 8px 0;
  color: #b0bec5;
  font-size: 12px;
  line-height: 1.4;
}

.label-category {
  color: #78909c;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}
</style>

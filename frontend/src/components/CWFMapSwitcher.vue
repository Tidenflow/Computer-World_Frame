<script setup lang="ts">
import { ref, computed } from 'vue';
import { Map, ChevronDown, Globe, GitBranch, Layers } from 'lucide-vue-next';
import { useMapStore } from '../store/map.store';

const mapStore = useMapStore();
const isOpen = ref(false);

const currentTitle = computed(() => mapStore.currentMapTitle);
const maps = computed(() => mapStore.availableMaps);

function toggleDropdown(): void {
  isOpen.value = !isOpen.value;
}

function closeDropdown(): void {
  isOpen.value = false;
}

async function selectMap(mapId: string): Promise<void> {
  closeDropdown();
  if (mapId === mapStore.currentMapId) return;
  await mapStore.switchMap(mapId);
}

function getMapIcon(mapId: string) {
  switch (mapId) {
    case 'computer-world': return Globe;
    case 'frontend': return Layers;
    case 'backend': return GitBranch;
    default: return Map;
  }
}
</script>

<template>
  <div class="map-switcher" v-if="maps.length > 0">
    <button class="switcher-trigger" @click="toggleDropdown" :class="{ active: isOpen }">
      <component :is="getMapIcon(mapStore.currentMapId)" :size="14" />
      <span class="trigger-label">{{ currentTitle }}</span>
      <ChevronDown :size="12" class="chevron" :class="{ rotated: isOpen }" />
    </button>

    <Transition name="dropdown">
      <div v-if="isOpen" class="dropdown-panel glass-panel" @click.stop>
        <div class="dropdown-header">切换地图</div>
        <div class="dropdown-list">
          <button
            v-for="map in maps"
            :key="map.mapId"
            class="dropdown-item"
            :class="{ selected: map.mapId === mapStore.currentMapId }"
            @click="selectMap(map.mapId)"
          >
            <component :is="getMapIcon(map.mapId)" :size="14" class="item-icon" />
            <span class="item-title">{{ map.title }}</span>
            <span v-if="map.parentMapId" class="item-badge">子图</span>
          </button>
        </div>
      </div>
    </Transition>

    <div v-if="isOpen" class="backdrop" @click="closeDropdown"></div>
  </div>
</template>

<style scoped>
.map-switcher {
  position: absolute;
  top: 16px;
  left: 100px;
  z-index: 20;
  display: flex;
  flex-direction: column;
}

.switcher-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 10px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.switcher-trigger:hover,
.switcher-trigger.active {
  border-color: rgba(59, 130, 246, 0.4);
  color: #f8fafc;
  background: rgba(30, 41, 59, 0.94);
}

.trigger-label {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  transition: transform 0.2s ease;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.dropdown-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 220px;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--border-slate);
  z-index: 100;
}

.dropdown-header {
  padding: 12px 16px 8px 16px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748b;
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
}

.dropdown-list {
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 280px;
  overflow-y: auto;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  width: 100%;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #f8fafc;
}

.dropdown-item.selected {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}

.item-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

.item-title {
  flex: 1;
}

.item-badge {
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 99;
}

/* Dropdown animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}
</style>

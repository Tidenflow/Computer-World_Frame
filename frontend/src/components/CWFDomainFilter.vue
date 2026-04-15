<script setup lang="ts">
import { computed, ref } from 'vue';
import { Layers, ChevronLeft, ChevronRight, Shuffle } from 'lucide-vue-next';
import { useMapStore } from '../store/map.store';
import type { DomainInfo } from '../types/domain-filter';
import { getDomainName, getDomainColor, DIMMED_COLOR } from '../types/domain-filter';

const mapStore = useMapStore();

const isCollapsed = ref(false);

const domains = computed((): DomainInfo[] => {
  if (!mapStore.frameMap) return [];

  const domainMap = new Map<string, number>();

  for (const node of mapStore.frameMap.document.nodes) {
    const domainId = node.domain || 'default';
    domainMap.set(domainId, (domainMap.get(domainId) ?? 0) + 1);
  }

  const selectedDomains = mapStore.selectedDomains;

  return Array.from(domainMap.entries())
    .map(([id, count]) => ({
      id,
      name: getDomainName(id),
      color: getDomainColor(id),
      count,
      visible: selectedDomains.size === 0 || selectedDomains.has(id)
    }))
    .sort((a, b) => b.count - a.count);
});

const totalNodes = computed(() => mapStore.frameMap?.document.nodes.length ?? 0);
const visibleNodes = computed(() => {
  const selected = mapStore.selectedDomains;
  if (selected.size === 0) return totalNodes.value;
  return Array.from(selected)
    .reduce((sum, domainId) => {
      const domain = domains.value.find(d => d.id === domainId);
      return sum + (domain?.count ?? 0);
    }, 0);
});

function toggleCollapse(): void {
  isCollapsed.value = !isCollapsed.value;
}

function toggleDomain(domainId: string): void {
  mapStore.toggleDomain(domainId);
}

function selectAll(): void {
  mapStore.selectAllDomains();
}

function clearAll(): void {
  mapStore.clearAllDomains();
}

function selectRandom(): void {
  const allDomainIds = domains.value.map(d => d.id);
  const randomCount = Math.max(1, Math.floor(Math.random() * allDomainIds.length));
  const shuffled = allDomainIds.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, randomCount);

  mapStore.clearAllDomains();
  for (const domainId of selected) {
    mapStore.toggleDomain(domainId);
  }
}
</script>

<template>
  <div class="domain-filter" :class="{ collapsed: isCollapsed }">
    <!-- 折叠按钮 -->
    <div v-if="isCollapsed" class="collapse-toggle" @click="toggleCollapse">
      <ChevronRight :size="18" />
    </div>

    <template v-else>
      <!-- 头部 -->
      <div class="filter-header" @click="toggleCollapse">
        <div class="header-title">
          <Layers :size="16" class="icon" />
          <div class="title-text">
            <h3>Categories</h3>
            <p class="subtitle">{{ visibleNodes }} / {{ totalNodes }} nodes</p>
          </div>
        </div>
        <ChevronLeft :size="16" class="collapse-icon" />
      </div>

      <!-- 控制按钮 -->
      <div class="control-buttons">
        <button class="ctrl-btn" @click="selectAll">All</button>
        <button class="ctrl-btn" @click="clearAll">Clear</button>
        <button class="ctrl-btn" @click="selectRandom" title="Random select">
          <Shuffle :size="12" />
        </button>
      </div>

      <!-- 领域列表 -->
      <div class="domain-list">
        <div
          v-for="domain in domains"
          :key="domain.id"
          class="domain-item"
          :class="{ inactive: !domain.visible }"
          @click="toggleDomain(domain.id)"
        >
          <div
            class="color-swatch"
            :style="{
              backgroundColor: domain.visible ? domain.color : DIMMED_COLOR,
              opacity: domain.visible ? 1 : 0.4
            }"
          />
          <div class="domain-info">
            <span class="domain-name">{{ domain.name }}</span>
            <span class="domain-count">{{ domain.count }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.domain-filter {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 16px;
  padding: 16px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.domain-filter.collapsed {
  padding: 12px 8px;
  width: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.collapse-toggle {
  cursor: pointer;
  padding: 8px;
  color: var(--text-weak, #94a3b8);
  transition: color 0.2s;
}

.collapse-toggle:hover {
  color: var(--text-primary, #f8fafc);
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  cursor: pointer;
  margin-bottom: 14px;
}

.header-title {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.icon {
  color: var(--text-weak, #94a3b8);
  margin-top: 2px;
}

.title-text h3 {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary, #f8fafc);
  margin: 0;
  letter-spacing: 0.02em;
}

.subtitle {
  font-size: 11px;
  color: var(--text-weak, #94a3b8);
  margin: 4px 0 0 0;
}

.collapse-icon {
  color: var(--text-weak, #94a3b8);
  opacity: 0.6;
  transition: opacity 0.2s;
}

.filter-header:hover .collapse-icon {
  opacity: 1;
}

.control-buttons {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
}

.ctrl-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  color: var(--text-muted, #cbd5e1);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(148, 163, 184, 0.3);
  color: var(--text-primary, #f8fafc);
}

.domain-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 280px;
  overflow-y: auto;
}

.domain-list::-webkit-scrollbar {
  width: 4px;
}

.domain-list::-webkit-scrollbar-track {
  background: transparent;
}

.domain-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.2);
  border-radius: 4px;
}

.domain-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.domain-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(148, 163, 184, 0.15);
}

.domain-item.inactive {
  opacity: 0.5;
}

.domain-item.inactive:hover {
  opacity: 0.8;
}

.color-swatch {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  flex-shrink: 0;
  transition: all 0.2s ease;
  box-shadow: 0 0 8px currentColor;
}

.domain-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 0;
}

.domain-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary, #f8fafc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.domain-count {
  font-size: 11px;
  color: var(--text-weak, #94a3b8);
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 8px;
  border-radius: 10px;
  flex-shrink: 0;
}
</style>

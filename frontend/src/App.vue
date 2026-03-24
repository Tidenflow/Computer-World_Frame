<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import type { CWFrameMap, CWFrameProgress } from '@shared/contract';
import { loadFrameMap, loadProgress } from './core/cwframe.loader';
import { buildStatusMap } from './core/cwframe.status';
import { unlockNode, lockNode, resetProgress } from './core/cwframe.progress';
import type { CWFrameNodeStatus } from './core/cwframe.status';

// 数据
const frameMap = ref<CWFrameMap | null>(null);
const progress = reactive<CWFrameProgress>({ userId: 1, unlockedNodes: {} });

// 状态
const inputValue = ref('');

// 初始化时加载数据
onMounted(async () => {
    const map = await loadFrameMap();
    const prog = await loadProgress();
    frameMap.value = map;
    Object.assign(progress, prog);  // 同步 mockProgress 到 reactive progress
});

// 根据 progress 实时计算 statusMap
const statusMap = computed(() => {
    if (!frameMap.value) return {};
    return buildStatusMap(frameMap.value, progress);
});

// 解锁节点
function handleUnlock(nodeId: number) {
    const node = frameMap.value?.nodes.find(n => n.id === nodeId);
    if (!node) return;
    unlockNode(progress, node);
}

// 锁定节点
function handleLock(nodeId: number) {
    const node = frameMap.value?.nodes.find(n => n.id === nodeId);
    if (!node) return;
    lockNode(progress, node);
}

// 输入框解锁（用户输入节点 ID）
function handleInputUnlock() {
    const id = parseInt(inputValue.value);
    if (!isNaN(id)) {
        handleUnlock(id);
    }
    inputValue.value = '';
}

// 重置
function handleReset() {
    resetProgress(progress);
}

// 状态颜色映射
function statusColor(status: CWFrameNodeStatus): string {
    switch (status) {
        case 'Unlocked': return '#4caf50';
        case 'Discoverable': return '#ff9800';
        case 'Locked': return '#9e9e9e';
    }
}
</script>

<template>
    <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1>CWFrame MVP</h1>

        <!-- 加载状态 -->
        <div v-if="!frameMap">Loading...</div>

        <template v-else>
            <!-- 输入区域 -->
            <div style="margin-bottom: 20px; display: flex; gap: 10px; align-items: center;">
                <input
                    v-model="inputValue"
                    placeholder="输入节点 ID 解锁"
                    @keyup.enter="handleInputUnlock"
                    style="padding: 8px; width: 200px;"
                />
                <button @click="handleInputUnlock" style="padding: 8px 16px;">解锁</button>
                <button @click="handleReset" style="padding: 8px 16px; background: #f44336; color: white; border: none;">
                    重置进度
                </button>
            </div>

            <!-- 图例 -->
            <div style="display: flex; gap: 20px; margin-bottom: 20px; font-size: 14px;">
                <span>🟢 Unlocked</span>
                <span>🟠 Discoverable</span>
                <span>⚪ Locked</span>
            </div>

            <!-- 节点列表 -->
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
                <div
                    v-for="node in frameMap.nodes"
                    :key="node.id"
                    style="border: 2px solid #333; border-radius: 8px; padding: 12px;"
                >
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span
                            style="width: 12px; height: 12px; border-radius: 50%; display: inline-block;"
                            :style="{ background: statusColor(statusMap[node.id]) }"
                        ></span>
                        <strong>{{ node.label }}</strong>
                        <span style="color: #888; font-size: 12px;">#{{ node.id }}</span>
                    </div>
                    <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                        {{ node.description }}
                    </div>
                    <div style="font-size: 11px; color: #aaa; margin-bottom: 8px;">
                        依赖: {{ node.dependencies.length ? node.dependencies.join(', ') : '无' }}
                    </div>
                    <div style="font-size: 12px; margin-bottom: 8px;">
                        状态: <strong>{{ statusMap[node.id] }}</strong>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button
                            @click="handleUnlock(node.id)"
                            :disabled="statusMap[node.id] === 'Unlocked'"
                            style="padding: 4px 8px; font-size: 12px;"
                        >解锁</button>
                        <button
                            @click="handleLock(node.id)"
                            :disabled="statusMap[node.id] === 'Locked'"
                            style="padding: 4px 8px; font-size: 12px;"
                        >锁定</button>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

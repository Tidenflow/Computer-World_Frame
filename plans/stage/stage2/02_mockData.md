# 260323/stage2/mock-data
# Stage 2 明日任务设计：前端逻辑闭环（不含 UI 设计）

## 明日目标

完成前端“数据 -> 规则计算 -> 状态流转 -> 渲染输入”的逻辑闭环：
- 正确读取 `CWFrameMap`
- 维护并更新 `CWFrameProgress`
- 将用户状态映射为节点状态（`LOCKED / DISCOVERABLE / UNLOCKED`）
- 仅验证逻辑正确性，不涉及视觉设计

---

## 范围边界

### 本次执行范围
- Mock 数据加载
- 节点状态计算
- 点亮逻辑（含依赖校验）
- 运行时状态更新
- 最小日志/文本输出验证

### 本次不含内容
- 复杂 UI 组件和样式
- 后端 API 接入
- 数据库存储
- 登录与权限

---

## 文件组织（建议）

```txt
frontend/src/
  data/
    world-data.json          # 静态地图规则（CWFrameMap）
    mock-progress.ts         # 初始用户进度（CWFrameProgress）

  core/
    cwframe-types.ts         # 可选：前端本地类型重导出
    cwframe-loader.ts        # loadCWFrameMap / loadMockProgress
    cwframe-status.ts        # 状态计算函数
    cwframe-progress.ts      # 点亮与进度更新函数

  composables/
    useCWFrame.ts            # 可选：组合逻辑（聚合 map/progress/actions）

  App.vue                    # 最小验证入口（仅逻辑输出）
```

说明：
- 已使用 `@shared/contract` 时，`cwframe-types.ts` 可省略。
- `App.vue` 当前仅用于逻辑验证，不要求布局和美化。

---

## 数据约定（基于当前接口）

```ts
export interface CWFrameNode {
  id: number;
  label: string;
  description: string;
  category: string;
  dependencies: number[];
}

export interface CWFrameMap {
  version: string | number;
  nodes: CWFrameNode[];
}

export interface CWFrameProgress {
  userId: number;
  unlockedNodes: Record<number, { unlockedAt: number }>;
}

export type NodeStatus = 'LOCKED' | 'DISCOVERABLE' | 'UNLOCKED';
```

---

## 核心函数设计（必须实现）

### 1) 加载层：`core/cwframe-loader.ts`

```ts
export function loadCWFrameMap(): CWFrameMap;
export function loadMockProgress(): CWFrameProgress;
```

职责：
- 提供统一数据读取入口
- 让上层逻辑与文件路径解耦

---

### 2) 规则层：`core/cwframe-status.ts`

```ts
export function getNodeById(map: CWFrameMap, nodeId: number): CWFrameNode | undefined;

export function isUnlocked(progress: CWFrameProgress, nodeId: number): boolean;

export function areDependenciesMet(
  node: CWFrameNode,
  progress: CWFrameProgress
): boolean;

export function getNodeStatus(
  node: CWFrameNode,
  progress: CWFrameProgress
): NodeStatus;

export function buildStatusIndex(
  map: CWFrameMap,
  progress: CWFrameProgress
): Record<number, NodeStatus>;
```

规则定义：
- `UNLOCKED`：`node.id` 存在于 `progress.unlockedNodes`
- `DISCOVERABLE`：未点亮且 `dependencies` 全部已点亮
- `LOCKED`：其余情况

---

### 3) 状态更新层：`core/cwframe-progress.ts`

```ts
export function canUnlock(
  nodeId: number,
  map: CWFrameMap,
  progress: CWFrameProgress
): boolean;

export function unlockNode(
  nodeId: number,
  map: CWFrameMap,
  progress: CWFrameProgress,
  now?: number
): CWFrameProgress;

export function unlockMany(
  nodeIds: number[],
  map: CWFrameMap,
  progress: CWFrameProgress,
  now?: number
): CWFrameProgress;
```

行为要求：
- 节点不存在：返回原进度
- 依赖不满足：返回原进度
- 已点亮：返回原进度
- 可点亮时更新 `unlockedNodes[nodeId]`
- 返回新对象（不可变更新）

---

### 4) 可选聚合层：`composables/useCWFrame.ts`

```ts
export function useCWFrame() {
  // state
  // map, progress, statusIndex

  // actions
  // refreshStatus, tryUnlock, resetProgress
}
```

用途：
- 集中管理加载、计算、更新动作
- 降低 `App.vue` 逻辑复杂度，便于后续拆分组件

---

## 明日开发步骤（执行顺序）

1. 确认数据文件
- `world-data.json` 已包含 10 个节点
- 新建/确认 `mock-progress.ts`（默认点亮根节点，如 `id=1`）

2. 实现加载函数
- 完成 `loadCWFrameMap`、`loadMockProgress`

3. 实现状态计算函数
- 完成 `getNodeStatus`、`buildStatusIndex`

4. 实现点亮动作函数
- 完成 `canUnlock`、`unlockNode`

5. 在 `App.vue` 完成最小逻辑验证
- 输出每个节点当前状态
- 模拟调用 `unlockNode` 后再次输出状态

6. 执行自测
- 随机测试 3 个节点
- 验证依赖未满足时不可点亮
- 验证点亮上游后下游转为可探索

---

## 最小验证示例（逻辑级）

```ts
// 初始化
const map = loadCWFrameMap();
let progress = loadMockProgress();

// 首次状态
let status = buildStatusIndex(map, progress);
console.table(status);

// 尝试点亮某节点
progress = unlockNode(3, map, progress);
status = buildStatusIndex(map, progress);
console.table(status);
```

---

## 明日验收标准（DoD）

- 成功加载 `CWFrameMap` 与 `CWFrameProgress`
- 成功输出全部节点状态索引
- `unlockNode` 行为符合依赖规则
- 点亮后状态变化可观测
- 全流程不依赖后端与复杂 UI

---

## 风险与应对

- 风险：`Record<number, ...>` 在 JS 中实际 key 为字符串
- 应对：统一使用 `String(nodeId)` 访问，或封装访问函数

- 风险：依赖关系引用不存在节点，导致状态异常
- 应对：后续补充 `validateMap(map)` 校验函数（可放 Stage 2.5）

---

> 结论：本次任务以“逻辑闭环”作为唯一目标；`Map + Progress + Unlock Rule` 跑通后，前端主链路成立。

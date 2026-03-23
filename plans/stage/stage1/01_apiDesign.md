# 260323/stage1/interface-design
# Stage 1 接口设计（仅数据契约）

本文档仅保留 Stage 1 的核心接口设计，不包含 API 路径、请求响应、错误码等实现细节。

目标：明确 `CWFrame` 的数据分层，支持前端先行与后端并行开发。

---

## 1. 设计原则

- **数据与状态分离**：`CWFrameMap` 定义知识结构，`CWFrameProgress` 记录用户状态。
- **最小可用**：先满足“地图渲染 + 节点点亮”闭环，不做过度字段设计。
- **可演进**：后续再按需要扩展成就、多存档、备注等能力。

---

## 2. 核心接口

```ts
/** 用户基础信息 */
export interface User {
  id: string;              // UUID
  username: string;        // 昵称
  email?: string;          // 可选
  createdAt: number;       // 时间戳
}

/** 单个知识节点（原子层） */
export interface CWFrameNode {
  id: string;              // e.g. "cpu"
  label: string;           // e.g. "CPU"
  description: string;
  category: string;        // e.g. "hardware"
  dependencies: string[];  // 前置节点 id
  tags?: string[];
}

/** 知识地图（容器层，静态） */
export interface CWFrameMap {
  version: string;
  nodes: CWFrameNode[];    // 扁平化存储
  config: {
    rootNodeId: string;
  };
}

/** 用户进度（状态层，动态） */
export interface CWFrameProgress {
  userId: string;
  unlockedNodes: Record<string, boolean>; // key=nodeId, value=是否点亮
  lastUpdatedAt: number;
}
```

---

## 3. 接口关系

- `User`：定义“你是谁”。
- `CWFrameNode`：定义“这个知识点是什么”。
- `CWFrameMap`：定义“整张知识地图长什么样”。
- `CWFrameProgress`：定义“这个用户点亮到了哪里”。

渲染关系：`UI = Render(CWFrameMap + CWFrameProgress)`。

---

## 4. Stage 1 边界

本阶段只保证：
- 地图结构可被加载和遍历
- 用户点亮状态可被读取与更新
- 可根据依赖关系计算 `LOCKED / DISCOVERABLE / UNLOCKED`

本阶段暂不引入：
- 点亮备注（`note`）
- 成就系统
- 多存档
- 地图编辑器

---

> 结论：Stage 1 先用最小接口跑通核心交互，后续再按真实需求扩展字段。

# 260323/problem_04
# 关系实现决策：CWFrameMap 与 Progress 如何联动

在接口设计完成后，真正的工程难点不再是“类型怎么定义”，而是“数据如何落地、关系如何运行”。

关键问题集中在两点：`CWFrameMap` 的节点关系如何存储，以及 `CWFrameProgress` 如何映射到地图并驱动 UI。

---

## 核心矛盾
`CWFrameMap` 需要承载全局知识关系，结构复杂且相对稳定；`CWFrameProgress` 只记录用户行为，数据轻量但高频变化。

如果把规则和状态混在一起，会导致维护困难；如果完全分离但没有统一映射流程，又会让渲染逻辑混乱。

## 推荐方案：静态地图 + 动态进度 + 运行时合并

**建议路径：** 以 `world-data.json` 作为地图事实源（Source of Truth），以 `CWFrameProgress` 作为用户状态源，在运行时进行 Hydration 合并渲染。

### 1. 为什么不建议把地图直接硬编码在页面中？
- **维护成本过高：** 在 `App.tsx` 或组件内写大规模节点数组，后续修改极不友好。
- **结构演进困难：** 节点和依赖变更会频繁触及前端逻辑文件，影响稳定性。
- **可复用性差：** 无法清晰复用到后端校验、离线工具或编辑器流程。

### 2. 为什么推荐 `JSON + Loader + Hydration`？
- **职责清晰：** 地图定义在静态文件，用户状态在数据库，边界明确。
- **性能可控：** 几百节点的 JSON 通常仅几十 KB，初始化加载成本很低。
- **扩展友好：** 后续可引入可视化编辑器生成 JSON，而无需重构业务主链路。

---

## 最佳实践：分阶段实现流程

### 第一阶段：落地 CWFrameMap 数据源
将整张地图存为 `world-data.json`，包含：
- `version`
- `nodes: CWFrameNode[]`（扁平化）
- `config.rootNodeId`

应用启动时通过 `import` 或 `fetch` 一次性加载到内存（如 Context / Zustand）。

### 第二阶段：落地 CWFrameProgress 状态源
用户进度仅记录“足迹”，例如：
- `userId`
- `unlockedNodes: Record<string, number>` 或 `litNodeIds: string[]`
- `updatedAt`

避免在进度表中冗余存储节点完整信息。

### 第三阶段：运行时映射（Hydration）
渲染公式保持统一：`UI = Render(Map + Progress)`。

遍历 `nodes` 时按 `node.id` 查询进度：
- 命中进度：渲染为“已点亮”
- 未命中但依赖满足：渲染为“可探索”
- 依赖不足：渲染为“锁定/灰暗”

---

> **架构提示：** `Map` 决定“规则”，`Progress` 记录“事实”。不要把 `status` 作为长期真值写死在用户数据里，否则地图规则变更时会带来大规模数据回填成本。

# 260323/problem_201
# Mock 数据决策：world-data 与 mock-progress 如何分工

在 Stage 2 中，当前目标不是先接数据库，而是先验证“节点关系与点亮逻辑”是否成立。

真正需要明确的是：`world-data.json` 与 `mock-progress.ts` 各自承担什么职责，以及它们如何共同驱动前端渲染。

---

## 核心矛盾
一方面，项目需要完整的知识地图结构（节点与依赖关系）；另一方面，项目又需要模拟“用户点亮进度”的动态状态。

如果把两者混在同一个文件或同一层逻辑里，会导致职责不清、后续接后端时改动过大。

## 推荐方案：静态规则文件 + 动态状态模拟

**建议路径：** 用 `world-data.json` 承载 `CWFrameMap`（规则层），用 `mock-progress.ts` 模拟后端返回的 `CWFrameProgress`（状态层），在页面运行时合并渲染。

### 1. 为什么不建议把所有数据塞进一个文件？
- **职责混乱：** 地图规则与用户状态语义不同，混写会影响维护。
- **扩展困难：** 后续替换真实后端时，无法平滑迁移。
- **调试低效：** 难以判断是“规则错”还是“状态错”。

### 2. 为什么推荐分层 Mock？
- **贴近真实架构：** 与未来线上结构一致（静态地图 + 动态进度）。
- **开发效率高：** 不依赖数据库也能验证核心逻辑。
- **迁移成本低：** 未来只替换 `mock-progress` 数据来源即可。

---

## 最佳实践：分阶段实现流程

### 第一阶段：落地 world-data.json（地图规则）
将 `CWFrameMap` 固化为 JSON，至少包含：
- `version`
- `nodes: CWFrameNode[]`
- 节点依赖关系 `dependencies`

该文件在 Stage 2 可手动维护，先保证逻辑可验证。

### 第二阶段：落地 mock-progress.ts（用户状态）
用 TypeScript 导出 `CWFrameProgress` 模拟数据，例如：
- `userId`
- `unlockedNodes`

只存“用户已点亮事实”，不重复存储节点结构。

### 第三阶段：运行时合并并验证
渲染公式保持统一：`UI = Render(Map + Progress)`。

渲染时按 `node.id` 查 `unlockedNodes`：
- 已存在：`UNLOCKED`
- 不存在但依赖满足：`DISCOVERABLE`
- 依赖不满足：`LOCKED`

---

> **架构提示：** `world-data` 模拟的是“知识框架读取结果”，`mock-progress` 模拟的是“后端返回的用户进度”。先把这两层分开，你就能在无数据库阶段稳定推进，并且为后续后端接入保留最小改动路径。

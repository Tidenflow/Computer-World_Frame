# 260324/problem_202
# 数据加载方案：如何从 mock 数据过渡到数据库

当前阶段需要明确数据加载的接口设计，确保从 mock 数据到数据库的平滑过渡。

---

## 核心问题

1. 如何读取 `frontend/src/data` 下的数据文件？
2. Mock-first 开发模式下，接口设计要注意什么？
3. 未来替换为数据库调用时，如何最小化改动？

---

## 数据源

### frontend/src/data/ 下的数据

- **world-data.json** — 框架节点数据（CWFrameMap）
- **mock-progress.ts** — 用户进度数据（CWFrameProgress）

---

## 推荐方案：Mock-first + 接口抽象

### 1. 为什么要先实现读取 mock 数据的版本？

- **验证核心逻辑：** 先验证"节点关系与点亮逻辑"是否成立
- **快速迭代：** 不依赖数据库也能推进开发
- **降低风险：** 早期发现问题成本低

### 2. cwframe-loader.ts 的设计要点

需要设计好 `cwframe-loader.ts` 的接口/抽象层：

- **当前阶段：** 调用 `@/data/mock-progress` 和 `world-data.json`
- **未来阶段：** 能方便地替换成数据库 API 调用

### 3. 接口设计原则

- 保持数据源可替换性
- 统一输出格式（CWFrameMap + CWFrameProgress）
- 最小化调用方改动

---

## 实现路径

### 第一阶段：实现 mock 数据读取

在 `cwframe-loader.ts` 中实现：
- 读取 `world-data.json` 获取地图结构
- 读取 `mock-progress.ts` 获取用户进度

### 第二阶段：预留数据库切换接口

设计统一的接口抽象，未来替换时只需：
- 修改数据源获取方式
- 保持输出格式不变

---

> **架构提示：** Mock-first 开发模式是正确的选择，先实现读取 mock 数据的版本，把接口设计好，之后替换为数据库调用即可。关键在于接口抽象层的合理设计。
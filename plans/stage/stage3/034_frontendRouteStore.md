# 前端工程化重构设计文档：Router & Store 体系

本文件定义了 Computer World Frame (CWF) 前端从单页原型（Prototype）向模块化 MVP 演进的架构蓝图。

## 1. 核心设计原则 (Core Principles)
- **保护核心 (Protect the Core)**：`src/core` 下的业务逻辑和 API 封装保持不变。
- **状态中心化 (State Centralization)**：使用 Pinia 管理跨页面/组件共享的数据（如用户进度、地图数据）。
- **组件解耦 (Component Decoupling)**：UI 组件不再直接处理复杂的 API 调用，而是通过 Store 进行交互。
- **SPA 路由体系**：引入 `vue-router` 处理多视图切换。

---

## 2. 目录结构与文件职责

### 📂 src/core (逻辑持久层 - 保留)
这些文件是项目的“引擎”，不随 UI 变化而改变。
- **cwframe.api.ts**: 负责与后端 Express 服务的 RESTful 通信。
- **cwframe.loader.ts**: 负责将原始 API 数据转换为图表可用的结构。
- **cwframe.progress.ts**: 定义“点亮”节点的本地验证逻辑。
- **cwframe.status.ts**: 根据 `frameMap` 和 `progress` 计算每个节点的 `Unlocked/Discoverable/Locked` 状态。

### 📂 src/store (全局状态层 - 核心重构)
使用 Pinia 实现了高度解耦的状态体系：
- **map.store.ts**: 
    - **职责**: 管理 3D 环境数据与视觉状态。
    - **Computed**: `statusMap` (实时计算节点点亮状态)。
- **user.store.ts**:
    - **职责**: 仅负责“身份”。管理登录、注册、退出逻辑。
- **progress.store.ts [独立模块]**:
    - **职责**: 管理“存档”。负责点亮节点的本地记录与**后端云端同步**。

### 📂 src/router (路由导航层 - 新增)
- **index.ts**:
    - **逻辑**: 实现了 **MVP 0.1 强制登录守卫**。
    - **规则**: 未登录用户尝试访问首页 `/` 会被强制重定向至 `/auth/login`。

### 📂 src/views (页面视图层 - 新增)
- **HomeView.vue**: 主地图视图。整合 `CWFrameGraph` 和 HUD 浮层。
- **Auth/LoginView.vue**: 极简玻璃态登录框。
- **Auth/RegisterView.vue**: 注册逻辑页面。

### 📂 src/components (UI 交互层)
- **CWFrameGraph.vue [保留]**: 通过 `map.store` 获取数据并渲染 Three.js 环境。
- **CWFrameNode.vue [保留]**: 渲染浮动在 3D 节点之上的 2D 文本标签。
- **CWFSearchHUD.vue [新增]**: 底部浮动搜索框。调用 `progressStore.unlockNode()` 执行点亮逻辑。
- **CWFNodeSidebar.vue [新增]**: **核心改进**。监听 `mapStore.selectedNodeId`，若不为空则从右侧滑出。
    - 包含节点描述、依赖关系。
    - **Spark AI** 按钮：点击后触发 AI 解释气泡。

---

## 3. 关键交互流程与守卫 (Guards)

### 3.1 强制登录流程 (Strict Auth Flow)
为了确保用户体验的连续性，系统在前端入口设置了拦截器：
- **未登录状态**: `userStore.isAuthenticated = false`。
- **拦截行为**: 任何非 `/auth/*` 的访问都会触发 `router.beforeEach` 守卫。
- **会话持久化**: 由于不使用 JWT，刷新页面会清空内存状态，回归登录页。

### 3.2 节点点亮流程 (Ignition Flow)
1. `CWFSearchHUD` 接收输入 -> 调用 `progressStore.unlockNode`。
2. 调用 `core/cwframe.progress.ts` 进行逻辑验证。
3. 验证通过 -> 更新 `progress` 内存 -> 异步调用 `api.updateProgress` 同步后端。
4. `mapStore.statusMap` 自动更新 -> 3D 节点颜色由于 `watch` 机制瞬间切换。

---

## 4. UI/UX 视觉规范 (Premium Design)
- **Theme**: 深邃宇宙暗色 (`#0a0a0f`)。
- **Glassmorphism**: 核心组件均采用 `backdrop-filter: blur(16px)` 实现磨砂玻璃质感。
- **Fonts**: 
    - 标题文本: **Outfit** (现代、圆润)。
    - 代码/数据: **JetBrains Mono** (极客感、清晰)。

---

## 5. 开发调试回顾：CORS 跨域全解析 (Focus Item)

### 5.1 遭遇的问题：加载无限转圈
**现象**: 前后端服务均已启动，但前端 HomeView 始终停留在“正在同步宇宙知识框架...”界面。
**核心原因**: 前端 Console 报错 `Access to fetch at ... blocked by CORS policy`。

### 5.2 什么是 CORS？
**CORS (Cross-Origin Resource Sharing)** 即“跨源资源共享”。
- **同源策略 (Same-Origin Policy)**: 浏览器出于安全考虑，禁止 `localhost:5173`（前端）去访问 `localhost:3000`（后端）。因为域名/端口不同，浏览器认为这是不安全的跨站脚本攻击。
- **解决机制**: 后端必须显式地告诉浏览器：“我信任来自 `localhost:5173` 的请求，请放行”。

### 5.3 解决方案
我们在后端项目中引入了 `cors` 中间件：
1. **安装**: `npm install cors`。
2. **应用**: 在 `app.ts` 中使用 `app.use(cors())`。
3. **效果**: 后端会在响应头中添加 `Access-Control-Allow-Origin: *`，浏览器收到后便不再拦截，数据载入逻辑得以继续执行。

---

## 6. 后续扩展性
- **AI 助手实装**: 在 `CWFNodeSidebar.vue` 中预留的 `Spark AI` 按钮可直接对接大连接口。
- **地图动态切换**: 本架构已支持通过修改 `mapStore.loadMap(id)` 来无缝切换不同的知识宇宙。

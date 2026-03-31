# Computer World Frame 前端总结报告

## 1. 这份报告的目的

这份文档的目标不是单纯列文件，而是帮我重新建立对当前前端代码的“整体控制感”。

当前前端经历过一轮较大的演化：

- 早期更偏向“以单个 Node 组件为核心”去理解和渲染图谱
- 现在已经转向“页面容器 + store 状态 + 2D SVG 图谱 + 详情面板”的结构
- 因为中间改动较大，旧接口、旧组件、旧思路和新逻辑并存，容易导致理解断层

所以这份总结重点回答几个问题：

- 现在前端到底有几个模块
- 每个模块分别负责什么
- 数据从哪里来，怎么流向 UI
- UI 是如何渲染出来的
- 当前渲染为什么已经不再依赖旧 `CWFrameNode` 方案
- 现阶段哪些地方已经稳定，哪些地方仍然处在过渡状态

---

## 2. 当前前端的总体结构

当前前端可以概括成 6 个层次：

1. 应用入口层  
负责启动 Vue、Pinia、Router。

2. 路由层  
决定用户当前看到哪一个页面，并用导航守卫做基础权限控制。

3. 页面层  
例如首页、登录页、注册页、个人页。页面负责组织布局和挂载组件。

4. 组件层  
例如头部、搜索栏、历史面板、图谱组件、详情侧栏。组件负责具体 UI 呈现和局部交互。

5. 状态层（Pinia Store）  
负责保存地图数据、用户进度、当前登录用户、当前选中的节点等前端核心状态。

6. 核心工具层（core）  
负责 API 调用、状态计算、进度更新、搜索匹配等纯逻辑能力。

换句话说，当前前端不再是“某一个节点组件驱动全页面”，而是：

`页面 -> 读取 store -> 组件根据 store 计算渲染 -> 用户操作再回写 store`

这是一个更接近正式项目的结构。

---

## 3. 目录与模块划分

### 3.1 应用入口

文件：

- `frontend/src/main.ts`
- `frontend/src/App.vue`
- `frontend/src/style.css`

职责：

- `main.ts` 启动 Vue 应用
- 注册 Pinia
- 注册 Router
- 挂载全局样式

当前逻辑非常简单：

- `createApp(App)`
- `app.use(pinia)`
- `app.use(router)`
- `app.mount('#app')`

`App.vue` 的职责也很纯：

- 提供最外层容器
- 渲染 `router-view`
- 给页面切换加一个淡入淡出的过渡

因此 `App.vue` 不是业务页面，它更像“总舞台”。

---

### 3.2 路由层

文件：

- `frontend/src/router/index.ts`

当前页面路由有四个：

- `/` -> `HomeView`
- `/auth/login` -> `LoginView`
- `/auth/register` -> `RegisterView`
- `/profile` -> `ProfileView`

路由守卫当前做的事：

- `login` 和 `register` 被当作公开页
- 其他页面默认需要登录
- 如果未登录访问受限页，跳到登录页
- 如果已经登录再访问登录/注册页，跳回首页

这里的设计说明当前项目的页面结构比较明确：

- 认证页是一组单独页面
- 主页才是图谱主界面
- 图谱主界面不是路由嵌套页面，而是一个完整的首页工作台

---

### 3.3 页面层

文件：

- `frontend/src/views/HomeView.vue`
- `frontend/src/views/Auth/LoginView.vue`
- `frontend/src/views/Auth/RegisterView.vue`
- `frontend/src/views/ProfileView.vue`

#### HomeView 的职责

`HomeView.vue` 是当前最核心的页面容器。

它负责：

- 页面初始化时加载图谱数据
- 页面初始化时加载用户进度
- 组织首页总体布局
- 挂载头部、搜索、历史、图谱、详情侧栏等模块
- 处理“地图还没加载完”的 loading 层

它本身不负责绘制图谱细节，也不负责节点详情内容，它更像“首页工作台”。

#### LoginView / RegisterView 的职责

这两个页面是标准认证页：

- 负责采集表单输入
- 调用 `user.store` 完成登录或注册
- 在成功后执行路由跳转
- 展示 loading 和错误信息

它们的 UI 已经是完整卡片式页面，不再只是临时占位。

#### ProfileView 的职责

目前还是占位页。

它已经接入路由，但业务功能还没有真正展开，因此现在更多是给未来扩展预留位置。

---

## 4. 当前状态层（Store）怎么分工

当前前端主要有 3 个 store：

- `user.store.ts`
- `progress.store.ts`
- `map.store.ts`

这三个 store 的职责边界其实已经比较清楚。

### 4.1 user.store

文件：

- `frontend/src/store/user.store.ts`

职责：

- 保存当前用户 ID
- 保存用户名
- 保存前端的登录态标记
- 封装登录、注册、退出登录行为

它是“认证状态源”。

当前内部数据：

- `userId`
- `username`
- `isAuthenticated`

当前动作：

- `login(payload)`
- `register(payload)`
- `logout()`

理解上可以把它看作“谁在用这个前端”的 store。

---

### 4.2 progress.store

文件：

- `frontend/src/store/progress.store.ts`

职责：

- 保存用户的解锁进度
- 保存哪些节点已经被解锁
- 提供解锁节点动作
- 提供清空进度动作
- 与后端同步进度

这是“图谱学习进度源”。

当前内部核心状态：

- `progress`
- `isLoaded`
- `unlockedNodesCount`

其中 `progress.unlockedNodes` 是最关键的结构，因为它直接决定：

- 哪些节点在图谱中是 `Unlocked`
- 哪些节点是 `Discoverable`
- 历史面板显示什么
- 进度统计显示什么

当前动作：

- `loadProgress()`
- `unlockNode(node, matchedTerm?)`
- `resetLocalProgress()`

这意味着，当前项目里的“解锁”不是一个局部 UI 效果，而是一个真正写进 store、再同步给后端的数据行为。

---

### 4.3 map.store

文件：

- `frontend/src/store/map.store.ts`

职责：

- 保存整个图谱数据 `frameMap`
- 保存当前选中节点 `selectedNodeId`
- 根据地图 + 进度推导节点状态 `statusMap`
- 推导出当前选中的节点对象 `selectedNode`
- 提供加载地图和选中节点的方法

这是“图谱结构状态源”。

当前内部核心状态：

- `frameMap`
- `selectedNodeId`
- `statusMap`
- `selectedNode`

这里要特别注意：

`map.store` 不负责“谁解锁了什么”，那是 `progress.store` 的责任。  
它负责的是“整张图长什么样”和“当前看哪一个节点”。

这就是为什么 `statusMap` 是一个计算属性，而不是直接写死的数据：

- 地图结构来自 `frameMap`
- 用户进度来自 `progressStore.progress`
- 两者组合后，才得到当前页面真正需要的节点状态

---

## 5. 核心逻辑层（core）在做什么

### 5.1 `cwframe.api.ts`

职责：

- 封装所有前端到后端的请求
- 管理基础 URL
- 管理 `cwframe_user_id` 的本地存储

当前暴露的方法主要有：

- `register`
- `login`
- `fetchDefaultMap`
- `fetchProgress`
- `updateProgress`
- `getCurrentUserId`
- `setCurrentUserId`

可以把它理解成“前端和后端说话的翻译层”。

---

### 5.2 `cwframe.status.ts`

职责：

- 根据节点依赖关系和当前进度，判断每个节点处于哪种状态

当前状态有 3 种：

- `Locked`
- `Discoverable`
- `Unlocked`

这里非常关键，因为它决定了图谱 UI 的视觉层级。

逻辑大意：

- 如果节点 ID 已存在于 `progress.unlockedNodes`，则是 `Unlocked`
- 否则，如果该节点所有依赖都已经解锁，则是 `Discoverable`
- 否则就是 `Locked`

这意味着“节点状态”并不是后端直接给前端的最终形态，而是前端根据地图和进度推导出来的结果。

---

### 5.3 `matching.ts`

职责：

- 处理搜索词与节点之间的匹配
- 把用户输入拆成多个术语

主要方法：

- `matchNodeByTerm(term, nodes)`
- `extractTerms(input)`

这块承担了搜索解锁的“入口匹配逻辑”。

当前匹配策略大致是：

1. 先精确匹配 `label`
2. 再匹配 `aliases`
3. 再做包含关系匹配

因此搜索 HUD 并不是直接拿输入框文本去调用 API，而是在前端先做一层节点匹配，再决定解锁哪个节点。

---

### 5.4 `cwframe.progress.ts`

职责：

- 提供纯函数式的进度更新能力

它当前更像“进度数据的原子操作层”，由 `progress.store` 调用。

所以真正的业务分工是：

- `cwframe.progress.ts` 负责“怎么改数据”
- `progress.store.ts` 负责“何时改、改完要不要同步服务端、要不要影响 UI”

---

## 6. 首页 UI 由哪些模块组成

首页由以下几个模块拼出来：

- `CWFHeader`
- `CWFSearchHUD`
- `CWFHistoryPanel`
- `CWFrameGraph`
- `CWFNodeSidebar`

### 6.1 CWFHeader

文件：

- `frontend/src/components/CWFHeader.vue`

职责：

- 显示产品标题
- 提供顶部导航区
- 承担视觉上的“页面框架入口”

它更偏展示型，不承担核心业务状态。

---

### 6.2 CWFSearchHUD

文件：

- `frontend/src/components/CWFSearchHUD.vue`

职责：

- 提供搜索输入框
- 提供建议关键词
- 调用搜索匹配逻辑
- 将匹配成功的节点交给 `progressStore.unlockNode`
- 弹出成功/失败反馈 toast

它是“用户主动推动图谱解锁”的入口。

当前核心流程：

1. 用户输入文本
2. `extractTerms` 拆词
3. 每个词调用 `matchNodeByTerm`
4. 匹配到节点后调用 `progressStore.unlockNode(matchedNode, term)`
5. 更新 `result`
6. 页面展示 toast

所以从产品视角看，它不是普通搜索框，而是“搜索即解锁”的交互组件。

---

### 6.3 CWFHistoryPanel

文件：

- `frontend/src/components/CWFHistoryPanel.vue`

职责：

- 把 `progress.unlockedNodes` 转成可展示的历史列表
- 显示节点名、解锁时间、匹配词
- 允许点击历史记录重新选中节点
- 允许清空进度

它本质上是 `progress.store` 的一个可视化窗口。

它并不自己保存历史，只是把已有进度重新映射成 UI。

这说明当前“历史记录”不是独立表，而是由进度推导出来的副视图。

---

### 6.4 CWFrameGraph

文件：

- `frontend/src/components/CWFrameGraph.vue`

这是当前项目最关键的 UI 组件。

职责：

- 从 `mapStore.frameMap` 读取节点数据
- 从 `mapStore.statusMap` 读取节点状态
- 计算每个节点在二维平面上的坐标
- 计算节点之间的连线
- 用 SVG 绘制整张知识图谱
- 处理节点点击，驱动选中状态

这是当前图谱渲染的核心。

#### 关键结论

现在首页图谱已经不是“循环渲染很多个 `CWFrameNode` 组件”，而是：

- 在一个组件里统一计算位置
- 在一个 SVG 里统一画点、画线、画标签

也就是说，当前方案是“图谱整体渲染”，不是“节点组件树渲染”。

这就是你感觉失去旧掌控感的根本原因，因为思维模型已经换了。

旧模型更像：

- 一个节点 = 一个组件
- 每个节点自己管自己的展示

现在模型更像：

- 整张图 = 一个画布
- 所有节点只是这个画布上的数据点
- 节点的 UI 是 `v-for` 渲染出的 SVG 元素，不是独立业务组件

这个变化非常重要。

#### 当前渲染逻辑的核心步骤

1. 从 `frameMap.nodes` 读取所有节点
2. 根据依赖关系计算深度 `depth`
3. 按深度把节点分桶 `buckets`
4. 根据深度和桶内顺序计算 `(x, y)`
5. 生成 `nodesWithPositions`
6. 根据依赖生成 `links`
7. 用 `<line>` 渲染边
8. 用 `<circle>` + `<text>` 渲染节点
9. 根据 `statusMap` 控制颜色、透明度、是否有 halo、是否可以交互

所以当前 `CWFrameGraph` 实际上承担了：

- 布局计算器
- 可视化渲染器
- 图谱交互入口

这也是为什么它现在已经是前端最值得重点理解的文件。

---

### 6.5 CWFNodeSidebar

文件：

- `frontend/src/components/CWFNodeSidebar.vue`

职责：

- 读取 `mapStore.selectedNode`
- 用模态层的形式展示节点详情
- 展示依赖节点列表
- 支持在详情中跳转到依赖节点
- 展示扩展内容（目前很多还是 mock 内容）

它是“当前选中节点”的详情容器。

重要的是：

- 它不自己决定显示哪个节点
- 它完全依赖 `mapStore.selectedNode`

也就是说，图谱点击 -> `selectedNodeId` 变化 -> `selectedNode` 变化 -> 详情面板显示，这是一个很标准的状态驱动 UI 链路。

---

## 7. 当前首页的真实渲染链路

这一部分是最重要的。

如果要一句话概括：

**首页是由 `HomeView` 拉起数据，再由 `CWFrameGraph` 基于 store 统一计算并绘制 SVG 图谱，由 `CWFNodeSidebar` 读取选中节点进行详情展示。**

更细一点的执行顺序如下：

### 第一步：页面挂载

`HomeView` 在 `onMounted` 中执行：

- 如果 `mapStore.frameMap` 为空，则 `loadMap()`
- 如果 `progressStore` 还没加载过，并且有 `userId`，则 `loadProgress()`

所以首页不是路由切进来立刻就能画图，而是先拉数据。

### 第二步：store 数据准备完成

地图数据进入：

- `mapStore.frameMap`

进度数据进入：

- `progressStore.progress`

### 第三步：派生状态自动计算

`mapStore.statusMap` 会根据：

- `frameMap`
- `progressStore.progress`

自动计算出每个节点当前是：

- `Locked`
- `Discoverable`
- `Unlocked`

### 第四步：图谱组件开始布局

`CWFrameGraph` 读取：

- `mapStore.frameMap`
- `mapStore.statusMap`
- `mapStore.selectedNodeId`

然后：

- 计算节点深度
- 计算坐标
- 生成边
- 渲染 SVG

### 第五步：用户点击节点

用户点击图上的某个节点时：

- `CWFrameGraph.handleNodeClick(nodeId)`
- 调用 `mapStore.selectNode(nodeId)`
- `selectedNodeId` 更新
- `selectedNode` 自动更新

### 第六步：详情侧栏显示

`CWFNodeSidebar` 中：

- `node = computed(() => mapStore.selectedNode)`

所以一旦 `selectedNode` 有值，模态详情就出现。

### 第七步：用户通过搜索解锁节点

用户在 `CWFSearchHUD` 输入术语时：

- 文本被切词
- 与节点进行匹配
- 命中后调用 `progressStore.unlockNode`

之后带来的连锁反应是：

- `progress.unlockedNodes` 变化
- `statusMap` 变化
- `CWFrameGraph` 自动重新渲染
- `CWFHistoryPanel` 自动更新
- `HomeView` 的进度统计自动更新

这就是当前前端最核心的“状态驱动渲染”链路。

---

## 8. 为什么现在已经不是旧 `CWFrameNode` 方案

你之前是凭借 `Node` 来理解渲染，这个感觉非常自然，因为那是一种“组件化节点思维”。

但当前代码的主图谱已经不是那种模式了。

### 旧思维

旧思维会倾向于：

- 每个节点是一个独立组件
- 组件自己决定位置、样式、交互
- 页面只是把很多节点组件拼起来

这种方式更像“DOM/组件列表驱动”。

### 当前思维

当前 `CWFrameGraph` 是：

- 先把所有节点当作数据
- 在同一个组件里统一算出空间位置
- 再用 SVG 一次性画出来

所以现在更接近：

- 数据可视化思维
- 画布思维
- 图结构渲染思维

而不是传统的“卡片列表 + 子组件复用”思维。

### 为什么会这么改

因为图谱这种东西天然更适合整体渲染：

- 节点之间有强依赖关系
- 布局是全局问题，不是局部问题
- 连线需要知道两个节点的坐标
- 状态变化常常影响整张图的视觉关系

所以从技术方向上看，从 `CWFrameNode` 转向 `CWFrameGraph` 其实是合理演化，不是推翻重来。

你可以把 `CWFrameNode` 理解为：

- 曾经用于某个更偏组件化渲染阶段的方案
- 现在主图谱的渲染职责已经被 `CWFrameGraph` 吸收了

也就是说，旧 `CWFrameNode` 被“优化掉”，本质上是因为职责被整体图谱组件接管了。

---

## 9. 当前 UI 的组织方式

当前 UI 更像一个“工作台页面”，而不是一个单纯详情页。

首页结构大致可以理解为三层：

### 顶层：固定头部

- `CWFHeader`

负责产品标题和顶部操作。

### 中层：主交互区

中层又分左右两栏：

左侧：

- `CWFHistoryPanel`
- 图谱类别说明
- 使用提示

右侧：

- `CWFrameGraph`
- 右上角进度统计浮层

### 浮层：详情面板和反馈层

- `CWFNodeSidebar`：节点详情模态
- `CWFSearchHUD` 的 toast：搜索反馈
- `HomeView` 的 loading-screen：加载状态覆盖层

所以当前 UI 不是单线流程，而是：

- 主舞台：图谱
- 辅助操作：搜索、历史、统计
- 浮层反馈：详情、toast、loading

这是比较成熟的控制台式 UI 结构。

---

## 10. 当前哪些模块是“核心必须理解”的

如果目的是重新掌控这个前端，我认为优先级应该是：

### 第一优先级

- `HomeView.vue`
- `CWFrameGraph.vue`
- `map.store.ts`
- `progress.store.ts`

因为这四个文件共同决定：

- 数据什么时候加载
- 图谱如何计算状态
- 图谱怎么渲染
- 用户解锁后 UI 怎么联动

### 第二优先级

- `CWFSearchHUD.vue`
- `CWFNodeSidebar.vue`
- `CWFHistoryPanel.vue`

因为它们代表首页三个最重要的交互面：

- 搜索解锁
- 详情查看
- 进度回看

### 第三优先级

- `user.store.ts`
- `router/index.ts`
- `cwframe.api.ts`
- `matching.ts`
- `cwframe.status.ts`

因为它们属于支撑层：

- 登录态
- 路由访问控制
- API 交互
- 搜索匹配
- 节点状态计算

---

## 11. 当前前端的几个关键设计特征

### 11.1 状态驱动明显强于组件驱动

当前代码不是“某个组件自己保存很多局部状态”，而是：

- 核心业务状态集中在 store
- 页面和组件更多是消费状态、触发动作

这对后续维护是好事。

### 11.2 图谱是整体渲染，不是节点碎片渲染

这是当前最关键的认知转变。

今后你再看图谱相关代码，要优先从：

- 整张图如何布局
- 整张图如何根据状态重绘

去理解，而不是从“某个节点组件为什么这样写”切入。

### 11.3 搜索不是纯展示功能，而是业务入口

搜索框不是“帮助查找”，而是“帮助解锁”。

这意味着 `CWFSearchHUD` 是一个业务组件，不只是视觉组件。

### 11.4 详情侧栏完全由选中状态驱动

这让节点详情逻辑很清晰：

- 图谱负责选中
- store 负责记录
- 侧栏负责展示

这是一个不错的分层。

---

## 12. 当前前端仍处于哪些过渡状态

虽然整体结构已经清晰，但当前代码仍有一些明显的过渡痕迹。

### 12.1 UI 文案和注释存在乱码/污染痕迹

从代码文本上看，多个文件里仍然存在乱码样式的字符串和注释。

即使有些可能只是当前终端或编码显示问题，它仍然说明：

- 当前前端还没有完成一次系统化清理
- 文案层、注释层和真实逻辑层还纠缠在一起

### 12.2 详情面板里有 mock 内容

`CWFNodeSidebar` 里的 `deepDive` 仍然是模拟数据。

说明这个面板当前结构已经存在，但内容层还不是完全真实业务数据。

### 12.3 登录态设计仍偏 MVP

当前登录态不是 token/session 体系，而是轻量本地用户 ID + 前端标记。

这不一定错，但确实说明：

- 当前更重功能联调
- 认证体系还不是最终版

### 12.4 一部分旧设计的影子还在心理模型里

你现在最大的困扰不一定是代码不能跑，而是：

- 旧认知还停留在 `CWFrameNode` 时代
- 新实现已经切到整体图谱渲染
- 脑中的模型和代码中的模型不再一致

这正是这份报告试图修复的地方。

---

## 13. 如果我要重新掌控这个前端，建议的阅读顺序

建议按下面顺序重新过一遍，而不是一上来扫全部文件：

1. 先看 `HomeView.vue`
2. 再看 `map.store.ts`
3. 再看 `progress.store.ts`
4. 然后重点看 `CWFrameGraph.vue`
5. 接着看 `CWFNodeSidebar.vue`
6. 再看 `CWFSearchHUD.vue`
7. 最后看 `router/index.ts`、`user.store.ts`、`cwframe.api.ts`

为什么这样排：

- 先知道页面长什么样
- 再知道状态长什么样
- 再知道图是怎么画出来的
- 最后补外围认证和接口

这样更容易重新建立“全景图”。

---

## 14. 一句话总结当前前端

当前前端的本质已经从“围绕单个 Node 组件组织页面”，演化成了一个**以 Pinia 状态为核心、以 SVG 图谱为主渲染器、以搜索解锁和节点详情为主要交互入口的图谱工作台应用**。

也就是说：

- 现在真正的核心不再是 `CWFrameNode`
- 而是 `HomeView + map/progress store + CWFrameGraph + CWFNodeSidebar`

如果我后续要继续维护这个项目，最应该抓住的主线就是：

**地图数据 -> 进度状态 -> 状态映射 -> SVG 图谱渲染 -> 节点选中 -> 详情展示 -> 搜索驱动解锁**

只要这条主线清楚，前端整体就不会再失控。

---

## 15. 给接下来整理代码的建议

下一步如果继续整理，我建议做三件事：

### 1. 明确“当前正式方案”

在文档和代码中都明确：

- 当前主图谱渲染器是 `CWFrameGraph`
- 旧 `CWFrameNode` 不再是主链路

### 2. 清理 UI 文案和注释

把乱码、污染注释、半废弃说明清掉，让代码可读性恢复。

### 3. 再做一次“模块保留/弃用”清单

把以下几类对象分清：

- 正式使用中的模块
- 暂时保留但未完成的模块
- 历史遗留但可删除的模块

这样你会更容易从“我怕自己失去控制”转成“我知道哪些是现在真正重要的代码”。

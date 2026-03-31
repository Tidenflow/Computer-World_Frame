# v0.1 后端阶段计划（新手友好版）

> 目标：在 v0.1 阶段完成最小可用后端，支持注册/登录、学习进度读写、前后端联调。
> 范围：先用 JSON 文件持久化，不引入数据库，不做复杂鉴权。

## 一、阶段目标与边界

### 1.1 最终目标（Done Definition）
- 前端可以通过 API 完成：注册、登录、读取进度、保存进度。
- 数据在后端重启后不丢失（JSON 文件持久化）。
- API 返回格式统一（成功/失败结构一致）。
- 核心接口有基本测试样例（手工或脚本都可）。

### 1.2 本阶段不做
- 不做 JWT / Session / RBAC。
- 不做数据库（MySQL/MongoDB）。
- 不做复杂安全策略（限流、风控、密码加密可放到下一阶段）。
- 不做 CWFrameMap 的后台编辑接口（只读或继续前端静态）。

---

## 二、建议目录结构

```text
backend/
  src/
    index.ts
    app.ts
    routes/
      health.routes.ts
      auth.routes.ts
      progress.routes.ts
      frameMap.routes.ts (可选)
    controllers/
      auth.controller.ts
      progress.controller.ts
    services/
      auth.service.ts
      progress.service.ts
    repositories/
      user.repo.ts
      progress.repo.ts
    middleware/
      error.middleware.ts
      validate.middleware.ts (可选)
    types/
      api.ts
      user.ts
      progress.ts
    utils/
      fileStore.ts
      response.ts
  data/
    users.json
    progress.json
```

---

## 三、API 设计草案（Day 1 先定稿）

### 3.1 通用返回结构
- 成功：`{ success: true, data, message }`
- 失败：`{ success: false, error: { code, message } }`

### 3.2 接口清单
1. `GET /api/health`
- 用途：服务健康检查
- 成功返回：服务状态、时间戳

2. `POST /api/auth/register`
- 入参：`{ username, password }`
- 规则：用户名唯一，长度合法
- 返回：`{ userId, username }`

3. `POST /api/auth/login`
- 入参：`{ username, password }`
- 规则：用户名存在且密码匹配
- 返回：`{ userId, username }`

4. `GET /api/progress/:userId`
- 返回：该用户 `unlockedNodes`

5. `PUT /api/progress/:userId`
- 入参：完整 progress 对象
- 返回：更新后的 progress

6. `GET /api/frame-map`（可选）
- 返回：世界节点图数据

---

## 四、按天执行计划（建议 7 天）

## Day 1：接口设计 + 工程骨架

### 今日目标
- 明确 API 契约与错误码。
- 搭好 Express + TypeScript 基础结构。
- 跑通 `GET /api/health`。

### 任务清单
1. 初始化后端目录结构（routes/services/repositories/types）。
2. 配置 `tsconfig`、启动脚本、开发脚本（如 `dev/build/start`）。
3. 写全局错误处理中间件。
4. 写统一响应工具（success/fail）。
5. 实现 `GET /api/health`。

### 当日产出
- 后端可启动。
- 可通过浏览器或接口工具访问 health。
- `API 说明文档 v0.1` 初稿（Markdown）。

### 验收标准
- `npm run dev` 可运行。
- `GET /api/health` 返回 200 且结构统一。

---

## Day 2：注册/登录（Auth）

### 今日目标
- 跑通最小用户系统。

### 任务清单
1. 设计 `users.json` 数据结构。
2. 实现 `user.repo.ts`：读取、按用户名查询、创建用户。
3. 实现 `auth.service.ts`：注册校验、登录校验。
4. 实现 `auth.routes.ts` + controller。
5. 完成基础参数校验（空值、长度、重复用户名）。

### 当日产出
- `POST /api/auth/register`
- `POST /api/auth/login`

### 验收标准
- 可以注册新用户。
- 重复用户名返回明确错误。
- 登录成功返回 userId。

---

## Day 3：Progress 读写

### 今日目标
- 用户学习进度可读可写。

### 任务清单
1. 设计 `progress.json` 数据结构（按 userId 存储）。
2. 实现 `progress.repo.ts`：按 userId 读取/更新。
3. 实现 `progress.service.ts`：用户存在性校验、数据合法性校验。
4. 实现 `GET /api/progress/:userId`。
5. 实现 `PUT /api/progress/:userId`。

### 当日产出
- Progress API 完整可用。

### 验收标准
- 能读取默认进度。
- 更新后再次读取能拿到新值。
- 重启服务后数据仍存在。

---

## Day 4：前后端联调（第一轮）

### 今日目标
- 前端从后端读取和保存真实进度。

### 任务清单
1. 前端 `cwframe.loader` 切换到后端 API。
2. 登录后保存 `userId`（先本地存储）。
3. 解锁节点后调用 `PUT /progress/:userId`。
4. 页面初始化调用 `GET /progress/:userId`。

### 当日产出
- 完整链路：登录 -> 拉进度 -> 解锁 -> 存进度。

### 验收标准
- 前端刷新后进度不丢。
- 不同用户读到各自进度。

---

## Day 5：错误处理与鲁棒性

### 今日目标
- 把“能跑”提升到“稳定可维护”。

### 任务清单
1. 统一错误码（如 `USER_EXISTS`、`INVALID_CREDENTIALS`、`USER_NOT_FOUND`）。
2. 输入校验补齐（类型、结构、边界值）。
3. 文件读写异常处理（文件不存在时初始化）。
4. 简单日志（请求方法、路径、耗时、错误信息）。

### 当日产出
- 更稳定的 API 返回与错误语义。

### 验收标准
- 异常请求不会导致服务崩溃。
- 所有错误都能返回可读 message。

---

## Day 6：测试与文档

### 今日目标
- 让项目可交付、可复现、可协作。

### 任务清单
1. 准备接口测试集合（Postman/Thunder Client）。
2. 写 `backend/README.md`：启动方式、数据文件说明、接口说明。
3. 写联调说明：前端如何配置后端地址。
4. 补充常见问题（端口占用、JSON 文件损坏处理）。

### 当日产出
- 可直接给他人运行的后端说明文档。

### 验收标准
- 新人按 README 可在 10 分钟内跑起后端。

---

## Day 7：缓冲与收尾

### 今日目标
- 修复遗留问题，形成 v0.1 稳定里程碑。

### 任务清单
1. 修复联调中发现的问题。
2. 清理无用代码与 TODO。
3. 锁定 v0.1 后端范围，准备下阶段 backlog。

### 当日产出
- `v0.1-backend` 稳定版本。

### 验收标准
- 关键流程全通过：注册、登录、拉进度、存进度。

---

## 五、每日工作节奏（建议）

- 30 分钟：当天目标和接口确认。
- 120 分钟：核心编码（service + route）。
- 30 分钟：本地验证（手工调用接口）。
- 30 分钟：写文档和提交说明。

> 新手建议：每天只保证“一个核心流程闭环”，不要贪多。

---

## 六、风险与应对

1. 风险：JSON 文件并发写入冲突
- 应对：v0.1 先串行写入；v0.2 再换数据库。

2. 风险：接口变更导致前端联调反复修改
- 应对：Day 1 固定 API 契约，后续只增量变更。

3. 风险：任务过多导致焦虑
- 应对：按天验收，未完成任务可顺延到 Day 7 缓冲。

---

## 七、你在这个阶段的学习重点（建议）

1. 学会把需求拆成 route / service / repo 三层。
2. 学会为 API 写“可读错误”，而不是只返回 500。
3. 学会通过联调验证契约，而不只看代码是否编译通过。
4. 学会写最小文档，让别人可复现你的结果。

> 你不需要一次做“完美后端”，先做“能稳定跑通并可维护”的后端，就是非常优秀的 v0.1。

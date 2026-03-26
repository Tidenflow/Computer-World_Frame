# 260326/stage3/api-and-router-design
# 后端 API 与路由分层

## 明日目标

完成后端“路由 -> 控制器 -> 服务层 -> 仓储层”的分层架构：
- 实现 RESTful API 路由绑定
- 实现请求参数解析与响应封装
- 实现业务逻辑与数据读写分离
- 完成认证、地图、进度管理四个模块

---

## 范围边界

### 本次执行范围
- 路由层（auth.routes、map.routes、health.routes、progress.routes）
- 控制器层（auth.controller、map.controller、progress.controller）
- 服务层（auth.service、map.service、progress.service）
- 仓储层（user.repo、map.repo、progress.repo）
- ApiResponse 统一响应封装

### 本次不含内容
- 数据库接入（仅用 JSON 文件模拟）
- 复杂权限校验（token 验证可先 mock）
- 日志与监控

---

## 文件组织（建议）

```txt
backend/src/
  routes/
    auth.routes.ts      # POST /api/auth/register, POST /api/auth/login
    map.routes.ts       # GET /api/maps/:mapId
    health.routes.ts      # GET /api/users/:userId
    progress.routes.ts  # GET/PUT /api/users/:userId/progress

  controllers/
    auth.controller.ts  # register / login
    map.controller.ts  # getMap
    progress.controller.ts  # getProgress / updateProgress

  services/
    auth.service.ts    # register / login 业务逻辑
    map.service.ts     # getMapById 业务逻辑
    progress.service.ts  # getProgress / updateProgress 业务逻辑

  repos/
    user.repo.ts       # 读写 users.json
    map.repo.ts        # 读写 maps.json
    progress.repo.ts   # 读写 progress.json

  types/
    api-response.ts    # ApiResponse<T> 封装

  index.ts             # 入口 & 路由注册
```

---

## 分层职责约定

| 层级 | 职责 |
|------|------|
| route | 绑定路由与 HTTP 方法，调用 controller |
| controller | 提取请求参数，调用 service，返回 ApiResponse |
| service | 实现业务规则校验，调用 repo |
| repo | 仅做 JSON 文件读写，不含业务逻辑 |

---

## 接口设计

### 1) 认证模块

#### POST /api/auth/register
```ts
// Request Body
{ username: string; password: string; email?: string }

// Response: ApiResponse<{ userId: number; token: string }>
```

流程：
1. `auth.routes` 绑定 POST /api/auth/register
2. `auth.controller.register` 提取 body 参数
3. `auth.service.register` 校验用户名重复
4. `user.repo` 写入 users.json
5. 返回 `ApiResponse<{ userId, token }>`

#### POST /api/auth/login
```ts
// Request Body
{ username: string; password: string }

// Response: ApiResponse<{ userId: number; token: string }>
```

流程：
1. `auth.routes` 绑定 POST /api/auth/login
2. `auth.controller.login` 提取 body 参数
3. `auth.service.login` 校验账号密码
4. `user.repo` 读取 users.json
5. 返回 `ApiResponse<{ userId, token }>`

---

### 2) 地图模块

#### GET /api/maps/:mapId
```ts
// Response: ApiResponse<CWFrameMap>
```

流程：
1. `map.routes` 绑定 GET /api/maps/:mapId
2. `map.controller.getMap` 提取 path 参数 mapId
3. `map.service.getMapById` 校验 mapId 存在
4. `map.repo` 读取对应 map JSON 文件
5. 返回 `ApiResponse<CWFrameMap>`

---

### 3) 用户进度模块

#### GET /api/users/:userId/progress
```ts
// Response: ApiResponse<CWFrameProgress>
```

流程：
1. `progress.routes` 绑定 GET /api/users/:userId/progress
2. `progress.controller.getProgress` 提取 path 参数 userId
3. `progress.service.getByUserId` 校验 userId 存在
4. `progress.repo` 读取 progress.json
5. 返回 `ApiResponse<CWFrameProgress>`

#### PUT /api/users/:userId/progress
```ts
// Request Body
{ unlockedNodes: Record<number, { unlockedAt: number }> }

// Response: ApiResponse<CWFrameProgress>
```

流程：
1. `progress.routes` 绑定 PUT /api/users/:userId/progress
2. `progress.controller.updateProgress` 提取参数
3. `progress.service.updateByUserId` 校验并合并数据
4. `progress.repo` 写入 progress.json
5. 返回 `ApiResponse<CWFrameProgress>`

---

## ApiResponse 封装

```ts
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

function success<T>(data: T): ApiResponse<T>;
function fail(code: string, message: string): ApiResponse<never>;
```

---

## 明日开发步骤（执行顺序）

1. 搭建项目基础结构
   - 安装 express、body-parser、cors
   - 创建 routes、controllers、services、repos 目录

2. 实现 ApiResponse 封装
   - 创建 `types/api-response.ts`

3. 实现仓储层
   - 实现 `user.repo.ts`、`map.repo.ts`、`progress.repo.ts`

4. 实现服务层
   - 实现 `auth.service.ts`、`map.service.ts`、`progress.service.ts`

5. 实现控制器层
   - 实现 `auth.controller.ts`、`map.controller.ts`、`progress.controller.ts`

6. 实现路由层
   - 实现各模块 routes 并在 index.ts 注册

7. 编写测试脚本
   - 用 curl 或 postman 验证各接口

---

## 明日验收标准（DoD）

- 路由、控制器、服务、仓储四层职责清晰
- 所有接口返回统一格式 ApiResponse
- 认证接口可正常注册与登录
- 地图接口可正确加载指定 map
- 进度接口可正确读取与更新用户进度
- 各层之间仅通过函数调用通信，无交叉依赖

---

## 风险与应对

- 风险：JSON 文件并发写入冲突
  - 应对：后续引入锁机制或迁移数据库

- 风险：业务逻辑散落在 controller 层
  - 应对：严格遵循分层约定，service 层不得直接读写文件

- 风险：路径参数校验缺失导致异常
  - 应对：在 controller 层做基础参数校验

---

> 结论：本次任务以“分层架构清晰、接口可用”为目标；完成后端主体链路成立。
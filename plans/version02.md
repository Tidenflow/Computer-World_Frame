# Computer World Frame - Version 0.2 开发计划

## 项目概述
在 v0.1 MVP 基础上，完善核心功能，提升用户体验，建立生产级架构。

---

## 一、前端 UI 优化

### 1.1 知识图谱可视化增强

#### 核心需求
- **大规模节点支持**：从 10 个节点扩展到 1000+ 节点
- **迷雾探索机制**：初始全黑，点亮节点后渐进式展示
- **权重可视化**：节点大小根据权重动态调整
- **缩放交互**：支持 zoom in/out 查看细节

#### 实现方案

**1. 节点权重系统**
```typescript
// shared/contract.ts
export interface CWFrameNode {
  id: number;
  label: string;
  description: string;
  category: string;
  dependencies: number[];
  weight: number;        // 新增：权重 1-10（影响节点大小）
  tier?: number;         // 新增：层级（用于分层展示）
}
```

**2. 迷雾探索机制**
- **初始状态**：Graph 区域全黑，所有节点隐藏
- **点亮节点**：
  - 节点完全显示（高亮、可交互）
  - 连线半亮（50% 透明度）
  - 相邻未点亮节点保持隐藏（轮廓可见但模糊）
- **视觉效果**：
  - 点亮动画：从中心扩散的光晕效果
  - 连线渐变：从点亮节点向未点亮节点渐变透明

**3. 缩放与性能优化**
- **LOD（Level of Detail）**：
  - 缩小视图：只显示 weight ≥ 7 的核心节点
  - 中等视图：显示 weight ≥ 4 的节点
  - 放大视图：显示所有节点
- **虚拟化渲染**：只渲染视口内的节点
- **Canvas 优化**：使用 WebGL 加速（如果节点 > 500）

**4. 技术选型**
- **方案 A**：保持 `@vue-flow` + 自定义缩放控制（快速迭代）
- **方案 B**：迁移到 `Cytoscape.js`（更好的大规模图谱性能）

**推荐**：先用方案 A 验证交互，如果性能不足再切换方案 B

---

### 1.2 UI 组件优化

**优化点：**
- 搜索 HUD：添加模糊搜索、历史记录
- 节点侧边栏：添加前置依赖可视化、学习路径推荐
- 进度面板：添加统计图表（解锁趋势、分类占比）
- 响应式设计：适配移动端

---

## 二、后端架构升级

### 2.1 数据库迁移（JSON → MySQL）

#### 数据库设计

**表结构：**

```sql
-- 1. 用户表
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,  -- bcrypt 加密
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username)
);

-- 2. 知识节点表
CREATE TABLE nodes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  weight INT DEFAULT 5,           -- 权重 1-10
  tier INT DEFAULT 1,              -- 层级
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_weight (weight)
);

-- 3. 节点依赖关系表（多对多）
CREATE TABLE node_dependencies (
  node_id INT NOT NULL,
  depends_on_node_id INT NOT NULL,
  PRIMARY KEY (node_id, depends_on_node_id),
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on_node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- 4. 用户进度表（核心表）
CREATE TABLE user_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  node_id INT NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  matched_term VARCHAR(100),       -- 触发解锁的搜索词
  UNIQUE KEY uk_user_node (user_id, node_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_unlocked_at (unlocked_at)
);

-- 5. Refresh Token 表（可选）
CREATE TABLE refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at)
);
```

#### 关于"用户进度存储"的说明

**问题**：用户点亮很多节点，关系型数据库怎么存储？

**答案**：使用 `user_progress` 表，每个点亮的节点是一行记录

**示例数据：**
```sql
-- 用户 1 点亮了 3 个节点
| id | user_id | node_id | unlocked_at         | matched_term |
|----|---------|---------|---------------------|--------------|
| 1  | 1       | 5       | 2026-04-01 10:00:00 | CPU          |
| 2  | 1       | 12      | 2026-04-01 10:05:00 | 寄存器       |
| 3  | 1       | 8       | 2026-04-01 10:10:00 | 内存         |
```

**查询示例：**
```sql
-- 获取用户 1 的所有点亮节点
SELECT node_id, unlocked_at, matched_term 
FROM user_progress 
WHERE user_id = 1 
ORDER BY unlocked_at DESC;

-- 获取用户 1 的进度统计
SELECT COUNT(*) as unlocked_count 
FROM user_progress 
WHERE user_id = 1;

-- 获取用户 1 在某个分类的进度
SELECT COUNT(*) as count 
FROM user_progress up
JOIN nodes n ON up.node_id = n.id
WHERE up.user_id = 1 AND n.category = '硬件';
```

**优势：**
- ✅ 查询灵活（按时间、分类、关键词筛选）
- ✅ 支持统计分析（进度趋势、热门节点）
- ✅ 扩展性好（可添加学习笔记、评分等字段）

**对比 JSON 存储：**
```json
// 旧方案：unlockedNodes 是一个对象
{
  "userId": 1,
  "unlockedNodes": {
    "5": { "unlockedAt": 1234567890 },
    "12": { "unlockedAt": 1234567900 },
    "8": { "unlockedAt": 1234567910 }
  }
}
```
- ❌ 无法高效查询（需要解析整个 JSON）
- ❌ 无法做复杂统计
- ❌ 数据冗余（每次更新都要传整个对象）

---

### 2.2 ORM 选择

**推荐：Prisma**

**理由：**
- ✅ TypeScript 原生支持，类型安全
- ✅ 自动生成类型定义
- ✅ 迁移管理简单
- ✅ 查询性能好

**安装：**
```bash
cd backend
npm install prisma @prisma/client
npx prisma init
```

**Prisma Schema 示例：**
```prisma
// backend/prisma/schema.prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           Int            @id @default(autoincrement())
  username     String         @unique @db.VarChar(50)
  passwordHash String         @map("password_hash") @db.VarChar(255)
  createdAt    DateTime       @default(now()) @map("created_at")
  updatedAt    DateTime       @updatedAt @map("updated_at")
  progress     UserProgress[]
  
  @@map("users")
}

model Node {
  id           Int                @id @default(autoincrement())
  label        String             @db.VarChar(100)
  description  String?            @db.Text
  category     String?            @db.VarChar(50)
  weight       Int                @default(5)
  tier         Int                @default(1)
  createdAt    DateTime           @default(now()) @map("created_at")
  dependencies NodeDependency[]   @relation("NodeDependencies")
  dependents   NodeDependency[]   @relation("DependentNodes")
  progress     UserProgress[]
  
  @@map("nodes")
}

model NodeDependency {
  nodeId          Int  @map("node_id")
  dependsOnNodeId Int  @map("depends_on_node_id")
  node            Node @relation("NodeDependencies", fields: [nodeId], references: [id], onDelete: Cascade)
  dependsOnNode   Node @relation("DependentNodes", fields: [dependsOnNodeId], references: [id], onDelete: Cascade)
  
  @@id([nodeId, dependsOnNodeId])
  @@map("node_dependencies")
}

model UserProgress {
  id          Int      @id @default(autoincrement())
  userId      Int      @map("user_id")
  nodeId      Int      @map("node_id")
  unlockedAt  DateTime @default(now()) @map("unlocked_at")
  matchedTerm String?  @map("matched_term") @db.VarChar(100)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  node        Node     @relation(fields: [nodeId], references: [id], onDelete: Cascade)
  
  @@unique([userId, nodeId], name: "uk_user_node")
  @@map("user_progress")
}
```

---

### 2.3 JWT 认证完善

#### 实现方案

**依赖安装：**
```bash
npm install jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs
```

**核心功能：**

1. **密码加密**
```typescript
// utils/password.ts
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

2. **JWT 生成与验证**
```typescript
// utils/jwt.ts
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: number } {
  return jwt.verify(token, JWT_SECRET) as { userId: number };
}
```

3. **认证中间件**
```typescript
// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: { code: 'UNAUTHORIZED', message: 'Missing token' } 
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;  // 挂载到 req 上
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } 
    });
  }
}
```

---

## 三、API 重构

### 3.1 新增 API

```typescript
// ===== 认证 API =====
POST   /api/auth/register       // 注册（返回 token）
POST   /api/auth/login          // 登录（返回 token）
POST   /api/auth/logout         // 登出（可选：加入黑名单）
POST   /api/auth/refresh        // 刷新 token（可选）

// ===== 节点 API =====
GET    /api/nodes               // 获取所有节点（支持分页、筛选）
GET    /api/nodes/:id           // 获取单个节点详情
GET    /api/nodes/:id/dependencies  // 获取节点依赖关系

// ===== 进度 API =====
GET    /api/progress            // 获取当前用户进度（从 token 获取 userId）
POST   /api/progress/unlock     // 解锁单个节点（增量更新）
GET    /api/progress/stats      // 获取进度统计
DELETE /api/progress            // 重置进度

// ===== 地图 API =====
GET    /api/maps/default        // 获取默认地图（保持不变）
```

### 3.2 API 优化点

**1. 使用 `me` 代替 `userId` 参数**
```typescript
// 旧：PUT /api/users/:userId/progress
// 新：GET /api/progress  （从 JWT 中获取 userId）
```

**2. 增量更新代替全量覆盖**
```typescript
// 旧：PUT 整个 unlockedNodes 对象
// 新：POST /api/progress/unlock { nodeId: 5, matchedTerm: "CPU" }
```

**3. 统一错误处理**
```typescript
// 所有 API 返回格式统一
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid node ID"
  }
}
```

---

## 四、开发任务清单

### Phase 1: 数据库迁移（优先级：高）
- [ ] 安装 Prisma 和 MySQL
- [ ] 编写 Prisma Schema
- [ ] 创建数据库迁移
- [ ] 编写数据迁移脚本（JSON → MySQL）
- [ ] 更新 Repository 层使用 Prisma

### Phase 2: JWT 认证（优先级：高）
- [ ] 安装 bcryptjs 和 jsonwebtoken
- [ ] 实现密码加密工具
- [ ] 实现 JWT 生成/验证工具
- [ ] 创建认证中间件
- [ ] 更新 auth.service 使用加密密码
- [ ] 更新所有需要认证的路由

### Phase 3: API 重构（优先级：中）
- [ ] 重构进度 API（增量更新）
- [ ] 新增节点查询 API
- [ ] 新增进度统计 API
- [ ] 前端更新 API 调用（添加 Authorization Header）
- [ ] 更新 shared/contract.ts 类型定义

### Phase 4: 前端 UI 优化（优先级：中）
- [ ] 添加节点 weight 属性到数据
- [ ] 实现迷雾探索机制（初始全黑）
- [ ] 实现点亮动画（节点高亮 + 连线半亮）
- [ ] 实现缩放控制（zoom in/out）
- [ ] 实现 LOD（根据缩放级别显示不同权重节点）
- [ ] 优化大规模节点性能（虚拟化渲染）

### Phase 5: 测试与优化（优先级：低）
- [ ] 编写单元测试（后端 Service 层）
- [ ] 编写集成测试（API 端到端）
- [ ] 性能测试（1000+ 节点渲染）
- [ ] 安全测试（SQL 注入、XSS）
- [ ] 部署文档编写

---

## 五、技术栈总结

### 前端
- Vue 3 + TypeScript + Vite
- Pinia（状态管理）
- Vue Router（路由）
- @vue-flow / Cytoscape.js（图谱可视化）
- D3.js（数据可视化）

### 后端
- Node.js + Express + TypeScript
- Prisma（ORM）
- MySQL（数据库）
- JWT（认证）
- bcryptjs（密码加密）

### 开发工具
- ESLint + Prettier（代码规范）
- Vitest（测试）
- Docker（容器化部署）

---

## 六、预期时间线

- **Week 1-2**: 数据库迁移 + JWT 认证
- **Week 3**: API 重构
- **Week 4-5**: 前端 UI 优化
- **Week 6**: 测试与优化

---

## 七、风险与挑战

1. **大规模节点性能**：1000+ 节点可能导致渲染卡顿
   - 缓解：使用 Canvas/WebGL、虚拟化渲染、LOD

2. **数据迁移复杂度**：JSON → MySQL 需要保证数据完整性
   - 缓解：编写迁移脚本 + 数据校验

3. **前端状态管理复杂度**：迷雾系统需要精细的状态控制
   - 缓解：使用 Pinia 集中管理、编写清晰的状态机

---

## 八、后续版本规划（v0.3+）

- 学习路径推荐（AI 驱动）
- 社区功能（分享进度、讨论）
- 移动端 App
- 多语言支持
- 数据导出/导入
- 第三方登录（OAuth）

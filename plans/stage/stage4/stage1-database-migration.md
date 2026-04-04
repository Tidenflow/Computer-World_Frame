# Stage 1: 数据库迁移（JSON → MySQL）

## 目标
将现有的 JSON 文件存储迁移到 MySQL 数据库，使用 Prisma ORM 管理数据。

---

## 一、环境准备

### 1.1 安装依赖
```bash
cd backend
npm install prisma @prisma/client
npm install mysql2
```

### 1.2 初始化 Prisma
```bash
npx prisma init
```

这会创建：
- `prisma/schema.prisma` - 数据库模型定义
- `.env` - 数据库连接配置

### 1.3 配置数据库连接
```env
# backend/.env
DATABASE_URL="mysql://root:password@localhost:3306/cwframe"
```

---

## 二、数据库设计

### 2.1 Prisma Schema

创建 `backend/prisma/schema.prisma`：

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// 用户表
model User {
  id           Int            @id @default(autoincrement())
  username     String         @unique @db.VarChar(50)
  passwordHash String         @map("password_hash") @db.VarChar(255)
  createdAt    DateTime       @default(now()) @map("created_at")
  updatedAt    DateTime       @updatedAt @map("updated_at")
  progress     UserProgress[]
  
  @@map("users")
  @@index([username])
}

// 知识节点表
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
  @@index([category])
  @@index([weight])
}

// 节点依赖关系表
model NodeDependency {
  nodeId          Int  @map("node_id")
  dependsOnNodeId Int  @map("depends_on_node_id")
  node            Node @relation("NodeDependencies", fields: [nodeId], references: [id], onDelete: Cascade)
  dependsOnNode   Node @relation("DependentNodes", fields: [dependsOnNodeId], references: [id], onDelete: Cascade)
  
  @@id([nodeId, dependsOnNodeId])
  @@map("node_dependencies")
}

// 用户进度表
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
  @@index([userId])
  @@index([unlockedAt])
}
```

### 2.2 表结构说明

**users 表**
- `id`: 主键，自增
- `username`: 用户名，唯一索引
- `password_hash`: bcrypt 加密后的密码
- `created_at/updated_at`: 时间戳

**nodes 表**
- `id`: 节点 ID
- `label`: 节点标签（如 "CPU"）
- `description`: 节点描述
- `category`: 分类（如 "硬件"、"操作系统"）
- `weight`: 权重 1-10（影响节点大小）
- `tier`: 层级（用于分层展示）

**node_dependencies 表**
- 多对多关系表
- `node_id`: 节点 ID
- `depends_on_node_id`: 依赖的节点 ID
- 例如：A 依赖 B，则存储 `(A.id, B.id)`

**user_progress 表**
- `user_id + node_id`: 联合唯一索引
- `unlocked_at`: 解锁时间
- `matched_term`: 触发解锁的搜索词

---

## 三、数据库迁移

### 3.1 创建数据库
```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE cwframe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3.2 运行 Prisma 迁移
```bash
npx prisma migrate dev --name init
```

这会：
1. 创建所有表
2. 生成 Prisma Client
3. 创建迁移历史

### 3.3 数据迁移脚本

创建 `backend/scripts/migrate-data.ts`：

```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function migrateUsers() {
  const usersData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../src/data/user.json'), 'utf-8')
  );
  
  for (const user of usersData) {
    await prisma.user.create({
      data: {
        id: user.id,
        username: user.username,
        passwordHash: user.password, // 注意：后续需要用 bcrypt 重新加密
        createdAt: new Date(user.timeStamp)
      }
    });
  }
  console.log('✅ Users migrated');
}

async function migrateNodes() {
  const mapData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../src/data/map.default.json'), 'utf-8')
  );
  
  // 先创建所有节点
  for (const node of mapData.nodes) {
    await prisma.node.create({
      data: {
        id: node.id,
        label: node.label,
        description: node.description,
        category: node.category,
        weight: node.weight || 5,
        tier: node.tier || 1
      }
    });
  }
  
  // 再创建依赖关系
  for (const node of mapData.nodes) {
    for (const depId of node.dependencies) {
      await prisma.nodeDependency.create({
        data: {
          nodeId: node.id,
          dependsOnNodeId: depId
        }
      });
    }
  }
  console.log('✅ Nodes and dependencies migrated');
}

async function migrateProgress() {
  const progressData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../src/data/progress.json'), 'utf-8')
  );
  
  for (const progress of progressData) {
    const unlockedNodes = progress.unlockedNodes;
    
    for (const [nodeId, data] of Object.entries(unlockedNodes)) {
      await prisma.userProgress.create({
        data: {
          userId: progress.userId,
          nodeId: parseInt(nodeId),
          unlockedAt: new Date(data.unlockedAt),
          matchedTerm: data.matchedTerm || null
        }
      });
    }
  }
  console.log('✅ Progress migrated');
}

async function main() {
  try {
    await migrateUsers();
    await migrateNodes();
    await migrateProgress();
    console.log('🎉 All data migrated successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

运行迁移：
```bash
npx tsx scripts/migrate-data.ts
```

---

## 四、更新 Repository 层

### 4.1 创建 Prisma Client 实例

创建 `backend/src/lib/prisma.ts`：

```typescript
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});
```

### 4.2 重构 user.repo.ts

```typescript
import { prisma } from '../lib/prisma';
import type { User } from '@shared/contract';

export class UserRepository {
  async findById(id: number): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!user) return null;
    
    return {
      id: user.id,
      username: user.username,
      timeStamp: user.createdAt.getTime()
    };
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { username }
    });
    
    if (!user) return null;
    
    return {
      id: user.id,
      username: user.username,
      timeStamp: user.createdAt.getTime()
    };
  }

  async create(data: { username: string; password: string }): Promise<User> {
    const user = await prisma.user.create({
      data: {
        username: data.username,
        passwordHash: data.password // 注意：Stage 2 会改用 bcrypt
      }
    });
    
    return {
      id: user.id,
      username: user.username,
      timeStamp: user.createdAt.getTime()
    };
  }
}

export const userRepo = new UserRepository();
```

### 4.3 重构 progress.repo.ts

```typescript
import { prisma } from '../lib/prisma';
import type { CWFrameProgress } from '@shared/contract';

export class ProgressRepository {
  async findByUserId(userId: number): Promise<CWFrameProgress | null> {
    const progressRecords = await prisma.userProgress.findMany({
      where: { userId }
    });
    
    if (progressRecords.length === 0) return null;
    
    const unlockedNodes: CWFrameProgress['unlockedNodes'] = {};
    
    for (const record of progressRecords) {
      unlockedNodes[record.nodeId] = {
        unlockedAt: record.unlockedAt.getTime()
      };
    }
    
    return { userId, unlockedNodes };
  }

  async upsertByUserId(data: CWFrameProgress): Promise<CWFrameProgress> {
    // 删除旧记录
    await prisma.userProgress.deleteMany({
      where: { userId: data.userId }
    });
    
    // 插入新记录
    const records = Object.entries(data.unlockedNodes).map(([nodeId, info]) => ({
      userId: data.userId,
      nodeId: parseInt(nodeId),
      unlockedAt: new Date(info.unlockedAt)
    }));
    
    await prisma.userProgress.createMany({
      data: records
    });
    
    return data;
  }
}

export const progressRepo = new ProgressRepository();
```

### 4.4 重构 map.repo.ts

```typescript
import { prisma } from '../lib/prisma';
import type { CWFrameMap, CWFrameNode } from '@shared/contract';

export class MapRepository {
  async getDefaultMap(): Promise<CWFrameMap> {
    const nodes = await prisma.node.findMany({
      include: {
        dependencies: true
      }
    });
    
    const cwfNodes: CWFrameNode[] = nodes.map(node => ({
      id: node.id,
      label: node.label,
      description: node.description || '',
      category: node.category || '',
      dependencies: node.dependencies.map(dep => dep.dependsOnNodeId),
      weight: node.weight,
      tier: node.tier
    }));
    
    return {
      version: '0.2',
      nodes: cwfNodes
    };
  }
}

export const mapRepo = new MapRepository();
```

---

## 五、测试验证

### 5.1 测试数据库连接
```bash
npx prisma studio
```
打开 Prisma Studio 可视化界面，检查数据是否正确迁移。

### 5.2 测试 API
```bash
# 启动后端
npm run dev

# 测试登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}'

# 测试获取地图
curl http://localhost:3000/api/maps/default
```

---

## 六、任务清单

- [ ] 安装 Prisma 和 MySQL 驱动
- [ ] 创建 Prisma Schema
- [ ] 配置数据库连接
- [ ] 运行数据库迁移
- [ ] 编写数据迁移脚本
- [ ] 运行数据迁移
- [ ] 创建 Prisma Client 实例
- [ ] 重构 user.repo.ts
- [ ] 重构 progress.repo.ts
- [ ] 重构 map.repo.ts
- [ ] 测试所有 API 功能
- [ ] 删除旧的 JSON 文件（备份后）

---

## 七、注意事项

1. **备份数据**：迁移前备份 `src/data/*.json`
2. **密码安全**：当前密码是明文，Stage 2 会改用 bcrypt
3. **事务处理**：复杂操作使用 Prisma 事务
4. **错误处理**：添加数据库连接失败的处理逻辑

---

## 八、下一步

完成 Stage 1 后，进入 Stage 2：JWT 认证完善

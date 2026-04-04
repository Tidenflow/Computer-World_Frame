# Stage 3: API 重构

## 目标
重构 API 设计，实现增量更新、统一响应格式、优化查询性能。

---

## 一、API 设计原则

### 1.1 RESTful 规范
- 使用正确的 HTTP 方法（GET/POST/PUT/PATCH/DELETE）
- 资源命名使用复数（/api/nodes 而非 /api/node）
- 使用 HTTP 状态码表达语义

### 1.2 从 Token 获取用户信息
- 不再从 URL 传递 userId
- 使用 `/api/progress` 代替 `/api/users/:userId/progress`
- 从 JWT Token 中提取 userId

### 1.3 增量更新
- 使用 PATCH 代替 PUT（部分更新）
- 单个节点解锁使用 POST `/api/progress/unlock`

---

## 二、新 API 设计

### 2.1 认证 API（已完成）
```
POST   /api/auth/register       # 注册
POST   /api/auth/login          # 登录
POST   /api/auth/logout         # 登出（可选）
```

### 2.2 节点 API（新增）
```
GET    /api/nodes               # 获取所有节点
GET    /api/nodes/:id           # 获取单个节点
GET    /api/nodes/:id/dependencies  # 获取节点依赖
```

### 2.3 进度 API（重构）
```
GET    /api/progress            # 获取当前用户进度
POST   /api/progress/unlock     # 解锁单个节点
GET    /api/progress/stats      # 获取进度统计
DELETE /api/progress            # 重置进度
```

### 2.4 地图 API（保持）
```
GET    /api/maps/default        # 获取默认地图
```

---

## 三、实现新 API

### 3.1 节点 Controller

创建 `backend/src/controllers/node.controller.ts`：

```typescript
import { Request, Response } from 'express';
import { nodeService } from '../services/node.service';
import { asyncHandler } from '../utils/async-handler';

export const nodeController = {
  // 获取所有节点
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const result = await nodeService.getAllNodes();
    res.json(result);
  }),

  // 获取单个节点
  getById: asyncHandler(async (req: Request, res: Response) => {
    const nodeId = parseInt(req.params.id);
    const result = await nodeService.getNodeById(nodeId);
    res.json(result);
  }),

  // 获取节点依赖
  getDependencies: asyncHandler(async (req: Request, res: Response) => {
    const nodeId = parseInt(req.params.id);
    const result = await nodeService.getNodeDependencies(nodeId);
    res.json(result);
  }),
};
```

### 3.2 节点 Service

创建 `backend/src/services/node.service.ts`：

```typescript
import type { ApiResponse, CWFrameNode } from '@shared/contract';
import { prisma } from '../lib/prisma';

export class NodeService {
  async getAllNodes(): Promise<ApiResponse<CWFrameNode[]>> {
    const nodes = await prisma.node.findMany({
      include: {
        dependencies: true,
      },
    });

    const cwfNodes: CWFrameNode[] = nodes.map(node => ({
      id: node.id,
      label: node.label,
      description: node.description || '',
      category: node.category || '',
      dependencies: node.dependencies.map(dep => dep.dependsOnNodeId),
      weight: node.weight,
      tier: node.tier,
    }));

    return {
      success: true,
      data: cwfNodes,
      message: 'ok',
    };
  }

  async getNodeById(nodeId: number): Promise<ApiResponse<CWFrameNode>> {
    if (!Number.isInteger(nodeId) || nodeId <= 0) {
      return {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid node ID' },
      };
    }

    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      include: {
        dependencies: true,
      },
    });

    if (!node) {
      return {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Node not found' },
      };
    }

    const cwfNode: CWFrameNode = {
      id: node.id,
      label: node.label,
      description: node.description || '',
      category: node.category || '',
      dependencies: node.dependencies.map(dep => dep.dependsOnNodeId),
      weight: node.weight,
      tier: node.tier,
    };

    return {
      success: true,
      data: cwfNode,
      message: 'ok',
    };
  }

  async getNodeDependencies(nodeId: number): Promise<ApiResponse<number[]>> {
    if (!Number.isInteger(nodeId) || nodeId <= 0) {
      return {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid node ID' },
      };
    }

    const dependencies = await prisma.nodeDependency.findMany({
      where: { nodeId },
      select: { dependsOnNodeId: true },
    });

    return {
      success: true,
      data: dependencies.map(dep => dep.dependsOnNodeId),
      message: 'ok',
    };
  }
}

export const nodeService = new NodeService();
```

### 3.3 节点 Router

创建 `backend/src/routers/node.router.ts`：

```typescript
import { Router } from 'express';
import { nodeController } from '../controllers/node.controller';

const router = Router();

router.get('/', nodeController.getAll);
router.get('/:id', nodeController.getById);
router.get('/:id/dependencies', nodeController.getDependencies);

export default router;
```

---

## 四、重构进度 API

### 4.1 进度 Controller

更新 `backend/src/controllers/progress.controller.ts`：

```typescript
import { Request, Response } from 'express';
import { progressService } from '../services/progress.service';
import { asyncHandler } from '../utils/async-handler';

export const progressController = {
  // 获取当前用户进度
  getProgress: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!; // 从 JWT 中获取
    const result = await progressService.getProgress(userId);
    res.json(result);
  }),

  // 解锁单个节点
  unlockNode: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { nodeId, matchedTerm } = req.body;
    const result = await progressService.unlockNode(userId, nodeId, matchedTerm);
    res.json(result);
  }),

  // 获取进度统计
  getStats: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const result = await progressService.getProgressStats(userId);
    res.json(result);
  }),

  // 重置进度
  resetProgress: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const result = await progressService.resetProgress(userId);
    res.json(result);
  }),
};
```

### 4.2 进度 Service

更新 `backend/src/services/progress.service.ts`：

```typescript
import type { ApiResponse, CWFrameProgress } from '@shared/contract';
import { prisma } from '../lib/prisma';

interface ProgressStats {
  totalNodes: number;
  unlockedNodes: number;
  progressPercentage: number;
  categoriesProgress: Record<string, { unlocked: number; total: number }>;
}

export class ProgressService {
  // 获取用户进度
  async getProgress(userId: number): Promise<ApiResponse<CWFrameProgress>> {
    const progressRecords = await prisma.userProgress.findMany({
      where: { userId },
    });

    const unlockedNodes: CWFrameProgress['unlockedNodes'] = {};
    for (const record of progressRecords) {
      unlockedNodes[record.nodeId] = {
        unlockedAt: record.unlockedAt.getTime(),
      };
    }

    return {
      success: true,
      data: { userId, unlockedNodes },
      message: 'ok',
    };
  }

  // 解锁单个节点（增量更新）
  async unlockNode(
    userId: number,
    nodeId: number,
    matchedTerm?: string
  ): Promise<ApiResponse<{ nodeId: number; unlockedAt: number }>> {
    if (!Number.isInteger(nodeId) || nodeId <= 0) {
      return {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid node ID' },
      };
    }

    // 检查节点是否存在
    const node = await prisma.node.findUnique({ where: { id: nodeId } });
    if (!node) {
      return {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Node not found' },
      };
    }

    // 检查是否已解锁
    const existing = await prisma.userProgress.findUnique({
      where: {
        uk_user_node: { userId, nodeId },
      },
    });

    if (existing) {
      return {
        success: true,
        data: {
          nodeId,
          unlockedAt: existing.unlockedAt.getTime(),
        },
        message: 'Node already unlocked',
      };
    }

    // 创建解锁记录
    const record = await prisma.userProgress.create({
      data: {
        userId,
        nodeId,
        matchedTerm,
      },
    });

    return {
      success: true,
      data: {
        nodeId,
        unlockedAt: record.unlockedAt.getTime(),
      },
      message: 'Node unlocked',
    };
  }

  // 获取进度统计
  async getProgressStats(userId: number): Promise<ApiResponse<ProgressStats>> {
    const [totalNodes, unlockedRecords, allNodes] = await Promise.all([
      prisma.node.count(),
      prisma.userProgress.findMany({
        where: { userId },
        include: { node: true },
      }),
      prisma.node.findMany(),
    ]);

    const unlockedCount = unlockedRecords.length;
    const progressPercentage = totalNodes > 0 ? (unlockedCount / totalNodes) * 100 : 0;

    // 按分类统计
    const categoriesProgress: Record<string, { unlocked: number; total: number }> = {};
    
    for (const node of allNodes) {
      const category = node.category || 'Other';
      if (!categoriesProgress[category]) {
        categoriesProgress[category] = { unlocked: 0, total: 0 };
      }
      categoriesProgress[category].total++;
    }

    for (const record of unlockedRecords) {
      const category = record.node.category || 'Other';
      categoriesProgress[category].unlocked++;
    }

    return {
      success: true,
      data: {
        totalNodes,
        unlockedNodes: unlockedCount,
        progressPercentage: Math.round(progressPercentage * 100) / 100,
        categoriesProgress,
      },
      message: 'ok',
    };
  }

  // 重置进度
  async resetProgress(userId: number): Promise<ApiResponse<{ deleted: number }>> {
    const result = await prisma.userProgress.deleteMany({
      where: { userId },
    });

    return {
      success: true,
      data: { deleted: result.count },
      message: 'Progress reset',
    };
  }
}

export const progressService = new ProgressService();
```

### 4.3 进度 Router

更新 `backend/src/routers/progress.router.ts`：

```typescript
import { Router } from 'express';
import { progressController } from '../controllers/progress.controller';

const router = Router();

router.get('/', progressController.getProgress);
router.post('/unlock', progressController.unlockNode);
router.get('/stats', progressController.getStats);
router.delete('/', progressController.resetProgress);

export default router;
```

---

## 五、更新路由配置

更新 `backend/src/app.ts`：

```typescript
import express from 'express';
import cors from 'cors';
import authRouter from './routers/auth.router';
import progressRouter from './routers/progress.router';
import mapRouter from './routers/map.router';
import nodeRouter from './routers/node.router';
import { notFoundMiddleware } from './middleware/not-found.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 公开路由
app.use('/api/auth', authRouter);
app.use('/api/maps', mapRouter);
app.use('/api/nodes', nodeRouter);  // 新增：节点查询公开

// 需要认证的路由
app.use('/api/progress', authMiddleware, progressRouter);  // 修改路径

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
```

---

## 六、前端适配

### 6.1 更新 API 调用

更新 `frontend/src/core/cwframe.api.ts`：

```typescript
// 获取所有节点
export async function fetchAllNodes(): Promise<CWFrameNode[]> {
  const response = await requestJson<CWFrameNode[]>('/api/nodes');
  return response;
}

// 获取单个节点
export async function fetchNodeById(nodeId: number): Promise<CWFrameNode> {
  return requestJson<CWFrameNode>(`/api/nodes/${nodeId}`);
}

// 获取当前用户进度（从 Token 获取 userId）
export async function fetchProgress(): Promise<CWFrameProgress> {
  return requestJson<CWFrameProgress>('/api/progress');
}

// 解锁单个节点（增量更新）
export async function unlockNode(
  nodeId: number,
  matchedTerm?: string
): Promise<{ nodeId: number; unlockedAt: number }> {
  return requestJson('/api/progress/unlock', {
    method: 'POST',
    body: JSON.stringify({ nodeId, matchedTerm }),
  });
}

// 获取进度统计
export async function fetchProgressStats(): Promise<{
  totalNodes: number;
  unlockedNodes: number;
  progressPercentage: number;
  categoriesProgress: Record<string, { unlocked: number; total: number }>;
}> {
  return requestJson('/api/progress/stats');
}

// 重置进度
export async function resetProgress(): Promise<{ deleted: number }> {
  return requestJson('/api/progress', {
    method: 'DELETE',
  });
}
```

### 6.2 更新 progress.store.ts

```typescript
// 更新 loadProgress
async function loadProgress(): Promise<void> {
  if (!userStore.userId) return;
  
  try {
    const data = await api.fetchProgress();  // 不再传 userId
    progress.userId = data.userId;
    progress.unlockedNodes = {};
    Object.assign(progress.unlockedNodes, data.unlockedNodes);
    isLoaded.value = true;
  } catch (error) {
    console.error('Failed to load progress:', error);
  }
}

// 更新 unlockNode
async function unlockNode(
  node: CWFrameNode,
  matchedTerm?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const result = await api.unlockNode(node.id, matchedTerm);
    
    // 更新本地状态
    progress.unlockedNodes[node.id] = {
      unlockedAt: result.unlockedAt,
    };
    
    return { success: true, message: `已点亮: ${node.label}` };
  } catch (error) {
    console.error('解锁节点失败:', error);
    return { success: false, message: '解锁失败' };
  }
}
```

---

## 七、任务清单

- [ ] 创建节点 Service
- [ ] 创建节点 Controller
- [ ] 创建节点 Router
- [ ] 重构进度 Service（增量更新）
- [ ] 重构进度 Controller
- [ ] 更新进度 Router
- [ ] 更新路由配置
- [ ] 前端更新 API 调用
- [ ] 前端更新 Store
- [ ] 测试所有新 API

---

## 八、下一步

完成 Stage 3 后，进入 Stage 4：前端 UI 优化

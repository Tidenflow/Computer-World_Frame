# Stage 2: JWT 认证完善

## 目标
实现完整的 JWT 认证系统，包括密码加密、Token 生成/验证、认证中间件。

---

## 一、依赖安装

```bash
cd backend
npm install jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs
```

---

## 二、环境配置

### 2.1 添加环境变量

在 `backend/.env` 中添加：

```env
# JWT 配置
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# 数据库配置
DATABASE_URL="mysql://root:password@localhost:3306/cwframe"
```

**生产环境建议**：使用强随机字符串作为 JWT_SECRET
```bash
# 生成随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 三、工具函数实现

### 3.1 密码加密工具

创建 `backend/src/utils/password.ts`：

```typescript
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * 加密密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 验证密码
 */
export async function verifyPassword(
  password: string, 
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### 3.2 JWT 工具

创建 `backend/src/utils/jwt.ts`：

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JwtPayload {
  userId: number;
  username: string;
}

/**
 * 生成 JWT Token
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN 
  });
}

/**
 * 验证 JWT Token
 */
export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * 解码 Token（不验证签名，用于调试）
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}
```

---

## 四、认证中间件

### 4.1 创建认证中间件

创建 `backend/src/middleware/auth.middleware.ts`：

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import type { ApiResponse } from '@shared/contract';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      userId?: number;
      username?: string;
    }
  }
}

/**
 * JWT 认证中间件
 */
export function authMiddleware(
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  
  // 检查 Authorization Header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header'
      }
    } as ApiResponse<null>);
    return;
  }
  
  // 提取 Token
  const token = authHeader.substring(7); // 去掉 "Bearer "
  
  try {
    // 验证 Token
    const payload = verifyToken(token);
    
    // 将用户信息挂载到 req 上
    req.userId = payload.userId;
    req.username = payload.username;
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      data: null,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      }
    } as ApiResponse<null>);
  }
}

/**
 * 可选认证中间件（Token 无效也继续，但不挂载用户信息）
 */
export function optionalAuthMiddleware(
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = verifyToken(token);
      req.userId = payload.userId;
      req.username = payload.username;
    } catch {
      // Token 无效，忽略
    }
  }
  
  next();
}
```

---

## 五、更新 Service 层

### 5.1 更新 auth.service.ts

```typescript
import type {
  ApiResponse,
  AuthData,
  LoginRequest,
  RegisterRequest,
} from '@shared/contract';
import { userRepo } from '../repositories/user.repo';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateToken } from '../utils/jwt';

function normalizeUsername(username: string): string {
  return username.trim();
}

function isNonEmpty(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export class AuthService {
  /**
   * 用户注册
   */
  async register(payload: RegisterRequest): Promise<ApiResponse<AuthData & { token: string }>> {
    const username = normalizeUsername(payload.username);
    const password = payload.password;

    if (!isNonEmpty(username) || !isNonEmpty(password)) {
      return {
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'username and password are required',
        },
      };
    }

    // 密码强度验证
    if (password.length < 6) {
      return {
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'password must be at least 6 characters',
        },
      };
    }

    const existed = await userRepo.findByUsername(username);
    if (existed) {
      return {
        success: false,
        data: null,
        error: {
          code: 'USER_EXISTS',
          message: 'username already exists',
        },
      };
    }

    // 加密密码
    const passwordHash = await hashPassword(password);
    const created = await userRepo.create({ username, password: passwordHash });

    // 生成 Token
    const token = generateToken({
      userId: created.id,
      username: created.username,
    });

    return {
      success: true,
      data: {
        userId: created.id,
        username: created.username,
        token,
      },
      message: 'register success',
    };
  }

  /**
   * 用户登录
   */
  async login(payload: LoginRequest): Promise<ApiResponse<AuthData & { token: string }>> {
    const username = normalizeUsername(payload.username);
    const password = payload.password;

    if (!isNonEmpty(username) || !isNonEmpty(password)) {
      return {
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'username and password are required',
        },
      };
    }

    const user = await userRepo.findByUsername(username);
    if (!user) {
      return {
        success: false,
        data: null,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'invalid username or password',
        },
      };
    }

    // 验证密码
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return {
        success: false,
        data: null,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'invalid username or password',
        },
      };
    }

    // 生成 Token
    const token = generateToken({
      userId: user.id,
      username: user.username,
    });

    return {
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        token,
      },
      message: 'login success',
    };
  }
}

export const authService = new AuthService();
```

---

## 六、更新路由

### 6.1 保护需要认证的路由

更新 `backend/src/app.ts`：

```typescript
import express from 'express';
import cors from 'cors';
import authRouter from './routers/auth.router';
import progressRouter from './routers/progress.router';
import mapRouter from './routers/map.router';
import { notFoundMiddleware } from './middleware/not-found.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 公开路由（不需要认证）
app.use('/api/auth', authRouter);
app.use('/api/maps', mapRouter);  // 地图数据公开

// 需要认证的路由
app.use('/api/users', authMiddleware, progressRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
```

---

## 七、更新类型定义

### 7.1 更新 shared/contract.ts

```typescript
// 添加 Token 到认证响应
export interface AuthData { 
  userId: number; 
  username: string;
  token?: string;  // 新增：JWT Token
}

// 新增错误码
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'USER_EXISTS'
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'PROGRESS_NOT_FOUND'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'UNAUTHORIZED'      // 新增
  | 'INVALID_TOKEN';    // 新增
```

---

## 八、前端适配

### 8.1 更新 API 调用

更新 `frontend/src/core/cwframe.api.ts`：

```typescript
// 添加 Token 管理
const TOKEN_STORAGE_KEY = 'cwframe_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

// 更新 requestJson 函数
async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init?.headers || {}),
  };
  
  // 添加 Authorization Header
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  });
  
  const data = (await response.json()) as ApiResponse<T>;

  if (!data.success) {
    // Token 过期，清除本地存储
    if (data.error.code === 'INVALID_TOKEN' || data.error.code === 'UNAUTHORIZED') {
      removeToken();
      localStorage.removeItem(USER_ID_STORAGE_KEY);
    }
    throw new Error(data.error.message);
  }

  return data.data;
}

// 更新登录函数
export async function login(payload: LoginRequest): Promise<AuthData> {
  const data = await requestJson<AuthData & { token: string }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  // 保存 Token 和 userId
  setToken(data.token);
  setCurrentUserId(data.userId);
  
  return data;
}

// 更新注册函数
export async function register(payload: RegisterRequest): Promise<AuthData> {
  const data = await requestJson<AuthData & { token: string }>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  // 保存 Token 和 userId
  setToken(data.token);
  setCurrentUserId(data.userId);
  
  return data;
}
```

### 8.2 更新 user.store.ts

```typescript
import { removeToken } from '../core/cwframe.api';

function logout(): void {
  userId.value = 1;
  username.value = '';
  isAuthenticated.value = false;
  localStorage.removeItem('cwframe_user_id');
  removeToken();  // 新增：清除 Token
}
```

---

## 九、测试验证

### 9.1 测试注册
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"123456"}'
```

预期响应：
```json
{
  "success": true,
  "data": {
    "userId": 1,
    "username": "testuser",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "register success"
}
```

### 9.2 测试登录
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"123456"}'
```

### 9.3 测试受保护的 API
```bash
# 不带 Token（应该返回 401）
curl http://localhost:3000/api/users/1/progress

# 带 Token（应该成功）
curl http://localhost:3000/api/users/1/progress \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 十、任务清单

- [ ] 安装 JWT 和 bcrypt 依赖
- [ ] 配置环境变量（JWT_SECRET）
- [ ] 实现密码加密工具
- [ ] 实现 JWT 工具
- [ ] 创建认证中间件
- [ ] 更新 auth.service.ts
- [ ] 更新路由保护
- [ ] 更新类型定义
- [ ] 前端适配（Token 管理）
- [ ] 测试所有认证流程

---

## 十一、安全建议

1. **JWT_SECRET**: 生产环境使用强随机字符串
2. **HTTPS**: 生产环境必须使用 HTTPS
3. **Token 过期**: 建议 7 天，根据业务调整
4. **密码强度**: 建议至少 8 位，包含大小写字母和数字
5. **Rate Limiting**: 添加登录频率限制（防暴力破解）

---

## 十二、下一步

完成 Stage 2 后，进入 Stage 3：API 重构

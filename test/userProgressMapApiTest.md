# 后端 API 测试用例设计 (Backend API Test Cases)

本文档包含了针对 `Auth`、`Map` 和 `Progress` 模块的测试用例设计，旨在验证后端路由的正确性和健壮性。

## 1. 用户认证模块 (Auth Module)

| 模块 | 测试场景 | 接口 | 输入参数 (Body) | 预期结果 (Status & JSON) |
| :--- | :--- | :--- | :--- | :--- |
| **注册** | 成功注册新用户 | `POST /api/auth/register` | `{ "username": "clark", "password": "clarkpw" }` | `201 Created` <br> `{ "success": true, "data": { "id": 5, "username": "clark", ... } }` |
| **注册** | 用户名已存在 | `POST /api/auth/register` | `{ "username": "alice", "password": "any" }` | `400 Bad Request` <br> `{ "success": false, "error": { "code": "USER_ALREADY_EXISTS", ... } }` |
| **登录** | 成功登录 | `POST /api/auth/login` | `{ "username": "bob", "password": "abc123" }` | `200 OK` <br> `{ "success": true, "data": { "id": 2, "username": "bob" } }` |
| **登录** | 密码错误 | `POST /api/auth/login` | `{ "username": "bob", "password": "wrong" }` | `401 Unauthorized` <br> `{ "success": false, "error": { "code": "INVALID_PASSWORD", ... } }` |
| **登录** | 用户不存在 | `POST /api/auth/login` | `{ "username": "nobody", "password": "any" }` | `404 Not Found` <br> `{ "success": false, "error": { "code": "USER_NOT_FOUND", ... } }` |

## 2. 地图模块 (Map Module)

| 模块 | 测试场景 | 接口 | 输入参数 | 预期结果 (Status & JSON) |
| :--- | :--- | :--- | :--- | :--- |
| **地图** | 获取默认地图 | `GET /api/map/default` | 无 | `200 OK` <br> `{ "success": true, "data": { "tiles": [...], "width": 20, ... } }` |

## 3. 进度模块 (Progress Module)

| 模块 | 测试场景 | 接口 | 输入参数 (Params/Body) | 预期结果 (Status & JSON) |
| :--- | :--- | :--- | :--- | :--- |
| **查询** | 获取现有用户进度 | `GET /api/progress/1/progress` | Params: `userId=1` | `200 OK` <br> `{ "success": true, "data": { "userId": 1, "unlockedNodes": { "1": {...}, "6": {...} } } }` |
| **查询** | 查询不存在的用户进度 | `GET /api/progress/999/progress` | Params: `userId=999` | `404 Not Found` <br> `{ "success": false, "error": { "code": "PROGRESS_NOT_FOUND" } }` |
| **更新** | 成功更新用户进度 | `PUT /api/progress/1/progress` | Params: `userId=1` <br> Body: `{ "unlockedNodes": { "1": {"unlockedAt": 1774455000000}, "6": {...}, "9": {"unlockedAt": 1774600100000} } }` | `200 OK` <br> `{ "success": true, "data": { "userId": 1, ... } }` |
| **更新** | 更新格式错误 (Body 为空) | `PUT /api/progress/1/progress` | Body: `{}` | `400 Bad Request` <br> (由于 `validateProgressBody` 中间件拦截) |

---

## 测试实施建议 (Implementation Notes)

为了达到**实战就业级**的质量，建议使用以下工具进行自动化测试：

1.  **测试框架**: `Vitest` (速度快，兼容 Jest 语法)。
2.  **集成测试工具**: `Supertest` (专门用于测试 Express 路由)。
3.  **数据清理**: 每次测试前使用 `beforeEach` 恢复 `user.json` 和 `progress.json` 的初始状态，避免测试用例之间的互相干扰。

示例代码片段 (Vitest + Supertest):
```typescript
import request from 'supertest';
import { app } from '../src/app';

describe('Auth API', () => {
    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'testuser', password: 'password123' });
        
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
    });
});
```

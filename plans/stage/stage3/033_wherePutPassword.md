# 260326/stage3/where-put-password
# Stage 3 问题记录：密码存储位置设计

## 问题描述

在 `User` 接口中为了安全没有显式设置 `password` 属性，但 `UserRepo` 查询用户时返回 `User` 类型，导致密码字段丢失。

---

## 问题分析

```ts
// contract 中当前定义
export interface User {
  id: number;
  username: string;
  email?: string;
  createdAt: number;
}

// repo 查询时
async findByUsername(username: string): Promise<User | null> {
  // 读取 users.json，返回 User 类型
  // password 字段被丢失
}
```

---

## 解决方案

### 方案：在 contract 中新增内部实体类型

```ts
// contract/shared/contract.ts

// 公开给外部的类型（不包含密码）
export interface User {
  id: number;
  username: string;
  email?: string;
  createdAt: number;
}

// 内部实体类型（仓库层使用，包含密码）
export interface UserEntity extends User {
  password: string; // 仅内部使用
}
```

### 仓储层使用

```ts
// user.repo.ts

import { UserEntity } from '@shared/contract';

async findByUsername(username: string): Promise<UserEntity | null> {
  const data = await this.readFile();
  const user = data.users.find(u => u.username === username);
  return user || null; // 返回包含 password 的完整对象
}

async findById(id: number): Promise<UserEntity | null> {
  // ...
}

async save(user: UserEntity): Promise<void> {
  // 写入包含 password 的完整数据
}
```

### 服务层/控制器层使用

```ts
// auth.service.ts

import { User, UserEntity } from '@shared/contract';

async validatePassword(username: string, password: string): Promise<User | null> {
  const userEntity = await this.userRepo.findByUsername(username);
  if (!userEntity) return null;
  
  // 校验密码
  if (!bcrypt.compare(password, userEntity.password)) return null;
  
  // 返回给上层时只返回 User（不含 password）
  const { password: _, ...user } = userEntity;
  return user;
}
```

---

## 设计原则

| 层级 | 可见类型 |
|------|----------|
| repo | UserEntity（包含 password） |
| service | 入参用 UserEntity，内部校验后返回 User |
| controller | 仅使用 User |
| route/API | 仅使用 User |

---

## 实施步骤

1. 在 `@shared/contract` 中添加 `UserEntity` 接口
2. 修改 `user.repo.ts` 返回 `UserEntity` 类型
3. 修改 `auth.service.ts` 校验密码后剔除 password 字段
4. 确保 controller 层只接收不含 password 的 User 类型

---

## 验收标准（DoD）

- `UserEntity` 在 contract 中明确定义
- repo 层返回包含密码的实体
- service 层校验完成后返回不含密码的 User
- 外部 API 响应中不包含 password 字段

---

## 风险与应对

- 风险：开发者误用 UserEntity 而非 User
  - 应对：在 service 层明确做字段剔除，不向上传递 password

- 风险：未来新增敏感字段需同步维护
  - 应对：建立实体类型命名规范，Entity 后缀表示内部使用

---

> 结论：通过分离公开类型与内部实体类型，既满足安全要求，又保证仓储层可访问完整数据。
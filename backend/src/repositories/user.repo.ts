import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { User } from '@shared/contract';

export interface UserEntity extends User {
  password: string; // only for backend internal storage
}

//or you should add "create(userData: Omit<User, "id"> & { password: string })"
export interface CreateUserInput {
  username: string;
  password: string;
  timeStamp?: number;
}                             

// Data access only: no business rules in repository.
export class UserRepo {
  private readonly filePath = path.resolve(process.cwd(), 'src/data/user.json');

  // 从 JSON 文件读取所有用户（带密码）
  private async readEntities(): Promise<UserEntity[]> {
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as UserEntity[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // 把用户数组写入 JSON 文件（保存数据）
  private async writeEntities(users: UserEntity[]): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(users, null, 2), 'utf-8');
  }

  // 工具方法 → 把带密码的用户 → 转成不带密码的公开用户
  private toPublicUser(entity: UserEntity): User {
    const { password: _password, ...user } = entity;
    return user;
  }

  // 获取全部完整用户（带密码） → 内部用
  async findAllEntity(): Promise<UserEntity[]> {
    const users = await this.readEntities();
    return users.map((u) => ({ ...u }));
  }

  // 获取全部公开用户（无密码） → 外部用 对每一个Entity执行toPublic
  async findAll(): Promise<User[]> {
    const users = await this.readEntities();
    return users.map((u) => this.toPublicUser(u));
  }

  // 根据 ID 查找完整用户（带密码）
  async findById(id: number): Promise<UserEntity | undefined> {
    const users = await this.readEntities();
    return users.find((user) => user.id === id);
  }

  // 根据用户名 查找完整用户（带密码）
  async findByUsername(username: string): Promise<UserEntity | undefined> {
    const users = await this.readEntities();
    return users.find((user) => user.username === username);
  }

  // 根据 ID 只拿密码
  async getPasswordById(id: number): Promise<string | null> {
    const user = await this.findById(id);
    return user ? user.password : null;
  }

  // 根据用户名 只拿密码（登录专用）
  async getPasswordByUsername(username: string): Promise<string | null> {
    const user = await this.findByUsername(username);
    return user ? user.password : null;
  }

  // 创建用户 → 写入文件持久化
  async create(input: CreateUserInput): Promise<UserEntity> {
    const users = await this.readEntities();
    const nextId = users.length === 0 ? 1 : Math.max(...users.map((u) => u.id)) + 1;

    const entity: UserEntity = {
      id: nextId,
      username: input.username,
      password: input.password,
      timeStamp: input.timeStamp ?? Date.now(),
    };

    users.push(entity);
    await this.writeEntities(users);
    return entity;
  }

  // 根据 ID 删除用户 → 写入文件
  async deleteById(id: number): Promise<boolean> {
    const users = await this.readEntities();
    const nextUsers = users.filter((user) => user.id !== id);
    if (nextUsers.length === users.length) return false;

    await this.writeEntities(nextUsers);
    return true;
  }
}

export const userRepo = new UserRepo();

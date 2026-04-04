import { prisma } from '../lib/prisma';
import type { User } from '@shared/contract';

export interface UserEntity extends User {
  password: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
}

export class UserRepo {
  async findById(id: number): Promise<UserEntity | undefined> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return undefined;
    return {
      id: user.id,
      username: user.username,
      password: user.passwordHash,
      timeStamp: user.createdAt.getTime()
    };
  }

  async findByUsername(username: string): Promise<UserEntity | undefined> {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return undefined;
    return {
      id: user.id,
      username: user.username,
      password: user.passwordHash,
      timeStamp: user.createdAt.getTime()
    };
  }

  async create(input: CreateUserInput): Promise<UserEntity> {
    const user = await prisma.user.create({
      data: {
        username: input.username,
        passwordHash: input.password
      }
    });
    return {
      id: user.id,
      username: user.username,
      password: user.passwordHash,
      timeStamp: user.createdAt.getTime()
    };
  }
}

export const userRepo = new UserRepo();

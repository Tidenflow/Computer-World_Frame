import type {
  ApiResponse,
  AuthData,
  LoginRequest,
  RegisterRequest,
} from '@shared/contract';
import { userRepo } from '../repositories/user.repo';

// 去除用户名前后空格  --工具函数
function normalizeUsername(username: string): string {
  return username.trim();
}
// 判断字符串是否非空  --工具函数
function isNonEmpty(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// 核心类：AuthService
export class AuthService {
  // 用户注册业务：校验 → 查重 → 创建用户 → 返回结果
  async register(payload: RegisterRequest): Promise<ApiResponse<AuthData>> {
    const username = normalizeUsername(payload.username);
    const password = payload.password;

    if (!isNonEmpty(username) || !isNonEmpty(password)) {  //用户名和密码有一个不存在都不行
      return {             // ApiResponse<AuthData>
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'username and password are required',
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

    const created = await userRepo.create({ username, password });
    return {
      success: true,
      data: {
        userId: created.id,
        username: created.username,
      },
      message: 'register success',
    };
  }

  // 用户登录业务：校验 → 查用户 → 验密码 → 返回结果
  async login(payload: LoginRequest): Promise<ApiResponse<AuthData>> {
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
    if (!user || user.password !== password) {
      return {
        success: false,
        data: null,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'invalid username or password',
        },
      };
    }

    return {
      success: true,
      data: {
        userId: user.id,
        username: user.username,
      },
      message: 'login success',
    };
  }
}

export const authService = new AuthService();

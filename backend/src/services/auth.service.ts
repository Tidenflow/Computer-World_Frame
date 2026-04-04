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
  async register(payload: RegisterRequest): Promise<ApiResponse<AuthData & { token: string }>> {
    const username = normalizeUsername(payload.username);
    const password = payload.password;

    if (!isNonEmpty(username) || !isNonEmpty(password)) {
      return {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'username and password are required' },
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'password must be at least 6 characters' },
      };
    }

    const existed = await userRepo.findByUsername(username);
    if (existed) {
      return {
        success: false,
        data: null,
        error: { code: 'USER_EXISTS', message: 'username already exists' },
      };
    }

    const passwordHash = await hashPassword(password);
    const created = await userRepo.create({ username, password: passwordHash });

    const token = generateToken({ userId: created.id, username: created.username });

    return {
      success: true,
      data: { userId: created.id, username: created.username, token },
      message: 'register success',
    };
  }

  async login(payload: LoginRequest): Promise<ApiResponse<AuthData & { token: string }>> {
    const username = normalizeUsername(payload.username);
    const password = payload.password;

    if (!isNonEmpty(username) || !isNonEmpty(password)) {
      return {
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'username and password are required' },
      };
    }

    const user = await userRepo.findByUsername(username);
    if (!user) {
      return {
        success: false,
        data: null,
        error: { code: 'INVALID_CREDENTIALS', message: 'invalid username or password' },
      };
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return {
        success: false,
        data: null,
        error: { code: 'INVALID_CREDENTIALS', message: 'invalid username or password' },
      };
    }

    const token = generateToken({ userId: user.id, username: user.username });

    return {
      success: true,
      data: { userId: user.id, username: user.username, token },
      message: 'login success',
    };
  }
}

export const authService = new AuthService();

/**
 * 本文件职责：封装与后端 API 的交互逻辑（前端唯一的网络请求入口）。
 */
import type {
  ApiResponse,
  AuthData,
  CWFrameMapPayload,
  UserProgressDocument,
  LoginRequest,
  RegisterRequest,
} from '@shared/contract';
import type { UserProgressDocument } from '@shared/map-document';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000';
const USER_ID_STORAGE_KEY = 'cwframe_user_id';
const USERNAME_STORAGE_KEY = 'cwframe_username';
const TOKEN_STORAGE_KEY = 'cwframe_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function hasActiveSession(): boolean {
  return Boolean(getToken());
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function decodeJwtPayload(token: string): { username?: string } | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = atob(padded);
    return JSON.parse(decoded) as { username?: string };
  } catch {
    return null;
  }
}

export function getCurrentUsername(): string {
  const saved = localStorage.getItem(USERNAME_STORAGE_KEY);
  if (saved) return saved;

  const token = getToken();
  if (!token) return '';

  const payload = decodeJwtPayload(token);
  const username = typeof payload?.username === 'string' ? payload.username : '';
  if (username) {
    setCurrentUsername(username);
  }

  return username;
}

export function setCurrentUsername(username: string): void {
  localStorage.setItem(USERNAME_STORAGE_KEY, username);
}

export function removeCurrentUsername(): void {
  localStorage.removeItem(USERNAME_STORAGE_KEY);
}

function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (init?.headers && !Array.isArray(init.headers) && !(init.headers instanceof Headers)) {
    Object.assign(headers, init.headers);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      ...init,
      headers,
    });
  } catch {
    throw new Error('Unable to reach backend service');
  }

  const data = (await response.json()) as ApiResponse<T>;

  if (!data.success) {
    if (data.error.code === 'INVALID_TOKEN' || data.error.code === 'UNAUTHORIZED') {
      removeToken();
      localStorage.removeItem(USER_ID_STORAGE_KEY);
      removeCurrentUsername();
    }
    throw new Error(data.error.message);
  }

  return data.data;
}

export function getCurrentUserId(): number {
  const saved = localStorage.getItem(USER_ID_STORAGE_KEY);
  const parsed = saved ? Number(saved) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function setCurrentUserId(userId: number): void {
  localStorage.setItem(USER_ID_STORAGE_KEY, String(userId));
}

export async function register(payload: RegisterRequest): Promise<AuthData> {
  const data = await requestJson<AuthData & { token: string }>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  setToken(data.token);
  setCurrentUserId(data.userId);
  setCurrentUsername(data.username);

  return data;
}

export async function login(payload: LoginRequest): Promise<AuthData> {
  const data = await requestJson<AuthData & { token: string }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  setToken(data.token);
  setCurrentUserId(data.userId);
  setCurrentUsername(data.username);

  return data;
}

/**
 * 获取默认知识图谱（地图）。
 *
 * @returns 默认地图（包含 document 和 projection）
 * @throws 后端返回失败时抛出 Error
 */
export async function fetchDefaultMap(): Promise<CWFrameMapPayload> {
  return requestJson<CWFrameMapPayload>('/api/maps/default');
}

/**
 * 获取指定用户的点亮进度。
 *
 * @param userId - 用户 id（正整数）
 * @returns 用户进度（unlocked 为点亮记录表）
 * @throws 后端返回失败时抛出 Error
 */
export async function fetchProgress(userId: number): Promise<UserProgressDocument> {
  return requestJson<UserProgressDocument>(`/api/users/${userId}/progress`);
}

/**
 * 更新指定用户的点亮进度（当前实现为”整份覆盖式”更新）。
 *
 * @param userId - 用户 id（正整数）
 * @param progress - 要写回服务端的进度对象
 * @returns 服务端保存后的进度对象
 * @throws 后端返回失败时抛出 Error
 */
export async function updateProgress(userId: number, progress: UserProgressDocument): Promise<UserProgressDocument> {
  return requestJson<UserProgressDocument>(`/api/users/${userId}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mapId: progress.mapId,
      mapVersion: progress.mapVersion,
      unlocked: progress.unlocked,
    }),
  });
}

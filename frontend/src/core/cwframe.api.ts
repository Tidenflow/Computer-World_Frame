/**
 * 本文件职责：封装与后端 API 的交互逻辑（前端唯一的网络请求入口）。
 *
 * - 所有接口都遵循 `shared/contract.ts` 中的 `ApiResponse<T>` 返回结构
 * - `requestJson<T>` 会在后端返回 `success: false` 时抛出异常（便于上层统一 catch）
 * - 登录/注册成功后会把 `userId` 持久化到 localStorage（MVP 版“会话”实现）
 */
import type {
  ApiResponse,
  AuthData,
  CWFrameMapPayload,
  UserProgressDocument,
  LoginRequest,
  RegisterRequest,
} from '@shared/contract';

/**
 * 后端地址（支持用 Vite 环境变量覆盖）。
 * - 优先读取 `VITE_API_BASE_URL`
 * - 未配置时默认 `http://localhost:3000`
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000';
const USER_ID_STORAGE_KEY = 'cwframe_user_id';
const USERNAME_STORAGE_KEY = 'cwframe_username';
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

/**
 * 发起请求并按后端约定解析 JSON。
 *
 * @template T - 成功时 `ApiResponse<T>` 内的 `data` 类型
 * @param path - API 路径（以 `/` 开头）
 * @param init - fetch 的 RequestInit（method/headers/body 等）
 * @returns 成功时返回后端 `data` 字段（类型为 T）
 * @throws 当后端返回 `{ success: false }` 时抛出 Error（message 来自后端 error.message）
 *
 * @example
 * const map = await requestJson<CWFrameMap>('/api/maps/default')
 */
async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  const headers = new Headers(init?.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
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

/**
 * 获取“当前用户 id”。
 *
 * 约定：从 localStorage 读取 `cwframe_user_id`；如果不存在或非法，则回退为 `1`。
 *
 * @returns 当前用户 id（正整数；MVP 默认返回 1）
 */
export function getCurrentUserId(): number {
  //从localStorage中拿对应的数据
  const saved = localStorage.getItem(USER_ID_STORAGE_KEY);
  const parsed = saved ? Number(saved) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * 设置“当前用户 id”（写入 localStorage）。
 *
 * @param userId - 要持久化的用户 id（建议为正整数）
 * @returns void
 */
export function setCurrentUserId(userId: number): void {
  // 存储到本地存储
  // 第一个参数是 key，第二个参数是 value
  // 这里把用户 id 转换为字符串，然后存储到本地存储
  localStorage.setItem(USER_ID_STORAGE_KEY, String(userId));
}

/**
 * 注册账号。
 *
 * @param payload - 注册请求体（用户名、密码）
 * @returns 注册成功后的凭证载体（userId、username）
 * @throws 后端返回失败时抛出 Error
 */
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

/**
 * 登录账号。
 *
 * - 成功后会把 `userId` 写入 localStorage（用于前端路由守卫恢复登录态）
 *
 * @param payload - 登录请求体（用户名、密码）
 * @returns 登录成功后的凭证载体（userId、username）
 * @throws 后端返回失败时抛出 Error
 */
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

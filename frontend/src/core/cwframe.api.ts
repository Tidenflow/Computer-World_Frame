/**
 * 本文件职责：封装与后端 API 的交互逻辑（前端唯一的网络请求入口）。
 */
import type {
  ApiResponse,
  AuthData,
  CWFrameMapPayload,
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

<<<<<<< HEAD
  const headers = new Headers(init?.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
=======
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
>>>>>>> 46e04ac (refactor: consume document-based maps in frontend)

  if (init?.headers && !Array.isArray(init.headers) && !(init.headers instanceof Headers)) {
    Object.assign(headers, init.headers);
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  });

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

export async function fetchDefaultMap(): Promise<CWFrameMapPayload> {
  return requestJson<CWFrameMapPayload>('/api/maps/default');
}

export async function fetchProgress(
  userId: number,
  mapId = 'computer-world',
  mapVersion?: string
): Promise<UserProgressDocument> {
  const params = new URLSearchParams({ mapId });
  if (mapVersion) {
    params.set('mapVersion', mapVersion);
  }
  return requestJson<UserProgressDocument>(`/api/users/${userId}/progress?${params.toString()}`);
}

export async function updateProgress(
  userId: number,
  progress: UserProgressDocument
): Promise<UserProgressDocument> {
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

export async function unlockProgressNode(payload: {
  userId: number;
  mapId: string;
  mapVersion: string;
  nodeId: string;
  matchedTerm?: string;
}): Promise<{ nodeId: string; unlockedAt: number }> {
  return requestJson<{ nodeId: string; unlockedAt: number }>('/api/users/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mapId: payload.mapId,
      mapVersion: payload.mapVersion,
      nodeId: payload.nodeId,
      matchedTerm: payload.matchedTerm,
    }),
  });
}

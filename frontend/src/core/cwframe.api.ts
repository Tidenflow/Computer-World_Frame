// 本文件的职责是：封装与后端API的交互逻辑
import type {
  ApiResponse,
  AuthData,
  CWFrameMap,
  CWFrameProgress,
  LoginRequest,
  RegisterRequest,
} from '@shared/contract';

// 读取环境变量中的API地址，如果没有配置的话就默认使用http://localhost:3000
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000';
// 读取环境变量中的用户ID，如果没有配置的话就默认使用1
const USER_ID_STORAGE_KEY = 'cwframe_user_id';

// 构建URL   --工具函数
function buildUrl(path: string): string {
  // 拼接URL
  return `${API_BASE_URL}${path}`;
}

// 发送请求并解析json  --工具函数
async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  // 核心 ： fetch 是浏览器提供的异步函数，用于发送网络请求
  const response = await fetch(buildUrl(path), init);
  // 核心 ： response.json() 是将响应体解析为json
  const data = (await response.json()) as ApiResponse<T>;

  if (!data.success) {
    throw new Error(data.error.message);
  }

  return data.data;
}

// 获取当前用户ID   --工具函数
export function getCurrentUserId(): number {
  const saved = localStorage.getItem(USER_ID_STORAGE_KEY);
  const parsed = saved ? Number(saved) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

// 设置当前用户ID   --工具函数
export function setCurrentUserId(userId: number): void {
  localStorage.setItem(USER_ID_STORAGE_KEY, String(userId));
}

// 注册   --API函数
export async function register(payload: RegisterRequest): Promise<AuthData> {
  return requestJson<AuthData>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// 登录   --API函数
export async function login(payload: LoginRequest): Promise<AuthData> {
  const data = await requestJson<AuthData>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  setCurrentUserId(data.userId);
  return data;
}

// 获取默认地图   --API函数
export async function fetchDefaultMap(): Promise<CWFrameMap> {
  return requestJson<CWFrameMap>('/api/maps/default');
}

// 获取进度   --API函数
export async function fetchProgress(userId: number): Promise<CWFrameProgress> {
  return requestJson<CWFrameProgress>(`/api/users/${userId}/progress`);
}

// 更新进度   --API函数
export async function updateProgress(userId: number, progress: CWFrameProgress): Promise<CWFrameProgress> {
  return requestJson<CWFrameProgress>(`/api/users/${userId}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unlockedNodes: progress.unlockedNodes }),
  });
}

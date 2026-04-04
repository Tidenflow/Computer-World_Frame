export interface User {
  id: number;
  username: string;
  timeStamp: number;
}

export interface CWFrameNode {
  id: number;
  label: string;
  description: string;
  category: string;
  dependencies: number[];
  weight?: number;
  tier?: number;
}

export interface CWFrameMap {
  version: string | number;
  nodes: CWFrameNode[];
}

export interface CWFrameProgress {
  userId: number;
  unlockedNodes: Record<number, { unlockedAt: number }>;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'USER_EXISTS'
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'PROGRESS_NOT_FOUND'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'UNAUTHORIZED'
  | 'INVALID_TOKEN';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
}

export type ApiResponse<T> =
  | { success: true; data: T; message?: string }
  | { success: false; data: null; error: ApiError };

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthData {
  userId: number;
  username: string;
  token?: string;
}

export type GetMapResponse = ApiResponse<CWFrameMap>;
export type GetProgressResponse = ApiResponse<CWFrameProgress>;

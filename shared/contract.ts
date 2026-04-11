import type { MapDocument, MapProjection, MapNodeDocument, UserProgressDocument } from './map-document';

// shared/contract.ts

//用户信息接口
export interface User {
    id : number;         //用户id
    username : string;  //用户名称
    timeStamp : number;   //账户创建时间
}

export type CWFrameNodeDocument = MapNodeDocument;

export interface CWFrameMapPayload {
    document: MapDocument;
    projection: MapProjection;
}

export type CWFrameProgressDocument = UserProgressDocument;


//枚举ApiError.code，防止后端随意返回
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

// 规定error格式
export interface ApiError {
  code: ApiErrorCode;
  message: string;
}

// 规定api返回格式
export type ApiResponse<T> =
  | { success: true; data: T; message?: string }
  | { success: false; data: null; error: ApiError };

// 规定注册请求格式
export interface RegisterRequest {
    username : string;
    password : string;
}
// 规定登录请求格式
export interface LoginRequest {
    username : string;
    password : string;
}
//凭证载体
export interface AuthData {
    userId: number;
    username: string;
    token?: string;
}

// ===== Map API =====
export type GetMapResponse = ApiResponse<CWFrameMapPayload>;
// ===== Progress API =====
export type GetProgressResponse = ApiResponse<UserProgressDocument>;

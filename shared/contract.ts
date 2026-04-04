// shared/contract.ts

//用户信息接口
export interface User {
    id : number;         //用户id
    username : string;  //用户名称
    timeStamp : number;   //账户创建时间
}

//知识节点接口
export interface CWFrameNode {
    id : number;                //节点id
    label : string;             //节点标签/标题
    description : string;       //节点描述  
    category : string;          //节点类别  “硬件”  “OS”
    dependencies : number[];    //依赖节点 ===> 理解为图中的边  
    // 比如A.dependencies = [B, C] 表示 A 依赖 B 和 C。就是B -> A、C -> A
}

//知识框架图接口
export interface CWFrameMap {
    version : string | number;  //框架版本
    nodes : CWFrameNode[];      //节点数组    nodes 是图里的顶点集合。
}

//用户进度接口
export interface CWFrameProgress {
    userId : number;
    unlockedNodes: Record<number, { unlockedAt: number }>; // 点亮记录
}


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
export type GetMapResponse = ApiResponse<CWFrameMap>;
// ===== Progress API =====
export type GetProgressResponse = ApiResponse<CWFrameProgress>;

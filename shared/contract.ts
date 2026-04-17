import type {
  MapDocument,
  MapNodeDocument,
  MapProjection,
  UserProgressDocument,
  NodeType,
  MapDomain,
} from './map-document';

// Re-export types for frontend use
export type { MapDocument, MapNodeDocument, MapProjection, UserProgressDocument, NodeType, MapDomain };

export interface User {
  id: number;
  username: string;
  timeStamp: number;
}

export type CWFrameNodeDocument = MapNodeDocument;

export interface CWFrameMapPayload {
  document: MapDocument;
  projection: MapProjection;
}

export type CWFrameProgressDocument = UserProgressDocument;

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

export type GetMapResponse = ApiResponse<CWFrameMapPayload>;
export type GetProgressResponse = ApiResponse<CWFrameProgressDocument>;

export interface MapListItem {
  mapId: string;
  title: string;
  nodeCount: number;
  parentMapId?: string;
}

export type GetMapListResponse = ApiResponse<MapListItem[]>;

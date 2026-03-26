// 后端定义的文字错误码，转换成前端 / HTTP 标准的数字状态码
import type { ApiErrorCode } from '@shared/contract';

export function statusByErrorCode(code: ApiErrorCode): number {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 400;
    case 'INVALID_CREDENTIALS':
      return 401;
    case 'USER_NOT_FOUND':
    case 'PROGRESS_NOT_FOUND':
    case 'NOT_FOUND':
      return 404;
    case 'USER_EXISTS':
      return 409;
    case 'SERVER_ERROR':
      return 500;
    default:
      return 400;
  }
}

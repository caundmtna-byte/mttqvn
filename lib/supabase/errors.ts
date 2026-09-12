/**
 * Chuẩn hoá lỗi Supabase / PostgREST. Dùng trong `SupabaseRepository` và mọi lời
 * gọi Supabase trực tiếp. Câu hiển thị cho người dùng nằm ở `./error-messages`.
 */
import { extractConstraintName } from './error-messages';

export interface NormalizedSupabaseError {
  message: string;
  code?: string;
  /** True for network/timeout errors where retry may help */
  retryable?: boolean;
}

/**
 * PostgrestError shape: { code, details, hint, message }
 * Auth errors may have different shape; we handle both.
 */
function isPostgrestError(err: unknown): err is { code?: string; message: string; details?: string } {
  return typeof err === 'object' && err !== null && 'message' in err;
}

/**
 * Dấu hiệu lỗi tạm thời trong message. Phải có `Failed to fetch` — đó là thông báo
 * trình duyệt dùng khi mất mạng, và nó KHÔNG chứa chữ "network".
 */
const RETRYABLE_MESSAGE_RE = /timeout|timed out|network|Failed to fetch|NetworkError|ECONNREFUSED|ETIMEDOUT/i;

/** PostgreSQL error codes that are often retryable (e.g. connection) */
const RETRYABLE_CODES = new Set([
  '08000', '08003', '08006', '08001', '08004', '08007', '08P01', '08P02', '08P03',
  'PGRST000', 'PGRST001', 'PGRST002', 'PGRST003',
]);

/**
 * Lỗi Supabase **giữ nguyên ngữ cảnh** để tầng trên dịch được sang tiếng Việt.
 *
 * Trước đây `handleSupabaseError` dựng đủ `{ message, code, retryable }` rồi
 * `throw new Error(message)` — vứt bỏ `code` ngay tại chỗ. Hệ quả: không nơi nào
 * phân loại được lỗi, `getErrorMessage` chỉ còn chuỗi tiếng Anh của Postgres để
 * đổ vào toast, và predicate retry phải dò chuỗi bằng regex.
 */
export class SupabaseAppError extends Error {
  readonly code?: string;
  readonly details?: string;
  /** Tên ràng buộc DB (vd. `uq_var_phong_ban_ten_lower`) — chìa khoá để ra câu cụ thể. */
  readonly constraint?: string;
  readonly retryable: boolean;

  constructor(init: {
    message: string;
    code?: string;
    details?: string;
    constraint?: string;
    retryable: boolean;
  }) {
    super(init.message);
    this.name = 'SupabaseAppError';
    this.code = init.code;
    this.details = init.details;
    this.constraint = init.constraint;
    this.retryable = init.retryable;
  }
}

export function handleSupabaseError(error: unknown): never {
  if (!isPostgrestError(error)) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new SupabaseAppError({
      message: msg || 'Supabase request failed',
      retryable: /timeout|network|Failed to fetch|ECONNREFUSED|ETIMEDOUT/i.test(msg),
    });
  }

  const code = error.code ?? '';
  const message = error.message || 'Lỗi kết nối dữ liệu';
  const details = error.details ?? '';
  const retryable = RETRYABLE_CODES.has(code) || RETRYABLE_MESSAGE_RE.test(message);

  throw new SupabaseAppError({
    message,
    code: code || undefined,
    details: details || undefined,
    constraint: extractConstraintName(`${message} ${details}`),
    retryable,
  });
}

/**
 * Use in try/catch when you want to get a normalized error without throwing:
 * try { ... } catch (e) { const err = normalizeSupabaseError(e); toast(err.message); }
 */
export function normalizeSupabaseError(error: unknown): NormalizedSupabaseError {
  if (isPostgrestError(error)) {
    const code = error.code ?? '';
    const message = error.message || 'Lỗi kết nối dữ liệu';
    const retryable = RETRYABLE_CODES.has(code) || RETRYABLE_MESSAGE_RE.test(message);
    return { message, code: code || undefined, retryable };
  }
  const msg = error instanceof Error ? error.message : String(error);
  return { message: msg || 'Lỗi không xác định' };
}

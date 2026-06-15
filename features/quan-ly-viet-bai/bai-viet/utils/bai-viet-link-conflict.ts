import { txt } from '@/lib/text';

const CONSTRAINT_LINK = 'uq_bai_viet_danh_sach_link_lower';

export class BaiVietLinkConflictError extends Error {
  readonly existingId: string;

  constructor(existingId: string) {
    super(txt('articleList.validation.linkDuplicate'));
    this.name = 'BaiVietLinkConflictError';
    this.existingId = existingId;
  }
}

export function normalizeBaiVietLinkForCompare(link: string | null | undefined): string {
  return String(link ?? '').trim().toLowerCase();
}

/** Escape `%` và `_` cho pattern ILIKE khớp chính xác. */
export function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function isPostgrestError(err: unknown): err is { code?: string; message: string } {
  return typeof err === 'object' && err !== null && 'message' in err;
}

/** Map Postgres unique violation (23505) → lỗi nghiệp vụ tiếng Việt. */
export function mapBaiVietLinkConstraintError(err: unknown): BaiVietLinkConflictError | null {
  if (!isPostgrestError(err)) return null;
  if (err.code !== '23505') return null;
  const msg = err.message ?? '';
  if (msg.includes(CONSTRAINT_LINK)) {
    return new BaiVietLinkConflictError('');
  }
  return null;
}

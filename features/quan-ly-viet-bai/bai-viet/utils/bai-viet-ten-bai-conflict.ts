import { txt } from '@/lib/text';

const CONSTRAINT_TEN_BAI = 'uq_bai_viet_danh_sach_ten_bai_lower';

export class BaiVietTenBaiConflictError extends Error {
  readonly existingId: string;

  constructor(existingId: string) {
    super(txt('articleList.validation.tenBaiDuplicate'));
    this.name = 'BaiVietTenBaiConflictError';
    this.existingId = existingId;
  }
}

/**
 * Chuẩn hoá tên bài để so trùng: bỏ khoảng trắng thừa (kể cả ở giữa) và bỏ phân
 * biệt hoa/thường. Phải khớp đúng biểu thức của unique index
 * `uq_bai_viet_danh_sach_ten_bai_lower` dưới DB, nếu không client sẽ cho qua một
 * cái tên mà DB lại chặn (hoặc ngược lại).
 */
export function normalizeBaiVietTenBaiForCompare(tenBai: string | null | undefined): string {
  return String(tenBai ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function isPostgrestError(err: unknown): err is { code?: string; message: string } {
  return typeof err === 'object' && err !== null && 'message' in err;
}

/** Map Postgres unique violation (23505) của tên bài → lỗi nghiệp vụ tiếng Việt. */
export function mapBaiVietTenBaiConstraintError(err: unknown): BaiVietTenBaiConflictError | null {
  if (!isPostgrestError(err)) return null;
  if (err.code !== '23505') return null;
  const msg = err.message ?? '';
  if (msg.includes(CONSTRAINT_TEN_BAI)) {
    return new BaiVietTenBaiConflictError('');
  }
  return null;
}

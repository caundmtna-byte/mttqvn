import { txt } from '@/lib/text';
import type { MttqUyVienUyBanFormValues } from '../core/schema';

export type UyVienConflictKind = 'can_bo' | 'ma_uv';

const CONSTRAINT_CAN_BO = 'uq_mttq_uy_vien_uy_ban_nhiem_ky_can_bo';
const CONSTRAINT_MA_UV = 'uq_mttq_uy_vien_uy_ban_nhiem_ky_ma_uv';

export class UyVienUyBanConflictError extends Error {
  readonly kind: UyVienConflictKind;
  readonly existingId: string;

  constructor(kind: UyVienConflictKind, existingId: string) {
    super(
      kind === 'can_bo'
        ? txt('matTranUyVienUyBan.validation.canBoDuplicateNhiemKy')
        : txt('matTranUyVienUyBan.validation.maUvDuplicateNhiemKy'),
    );
    this.name = 'UyVienUyBanConflictError';
    this.kind = kind;
    this.existingId = existingId;
  }
}

export function normalizeMaUvForCompare(maUv: string | null | undefined): string | null {
  const t = String(maUv ?? '').trim();
  return t === '' ? null : t.toLowerCase();
}

export type UyVienUniquenessRow = {
  id: string;
  can_bo_id: string;
  ma_uv: string | null;
};

export function validateUyVienUniqueness(
  data: MttqUyVienUyBanFormValues,
  context: {
    uyVienInNhiemKy: readonly UyVienUniquenessRow[];
    excludeId?: string | null;
  },
): { field: 'can_bo_id' | 'ma_uv'; message: string } | null {
  const exclude = String(context.excludeId ?? '').trim();
  const canBoId = String(data.can_bo_id).trim();
  const maUvNorm = normalizeMaUvForCompare(data.ma_uv);

  for (const row of context.uyVienInNhiemKy) {
    if (exclude && String(row.id) === exclude) continue;
    if (canBoId && String(row.can_bo_id).trim() === canBoId) {
      return {
        field: 'can_bo_id',
        message: txt('matTranUyVienUyBan.validation.canBoDuplicateNhiemKy'),
      };
    }
    if (maUvNorm) {
      const rowMa = normalizeMaUvForCompare(row.ma_uv);
      if (rowMa && rowMa === maUvNorm) {
        return {
          field: 'ma_uv',
          message: txt('matTranUyVienUyBan.validation.maUvDuplicateNhiemKy'),
        };
      }
    }
  }
  return null;
}

function isPostgrestError(err: unknown): err is { code?: string; message: string } {
  return typeof err === 'object' && err !== null && 'message' in err;
}

/** Map Postgres unique violation (23505) → lỗi nghiệp vụ tiếng Việt. */
export function mapUyVienConstraintError(err: unknown): UyVienUyBanConflictError | null {
  if (!isPostgrestError(err)) return null;
  if (err.code !== '23505') return null;
  const msg = err.message ?? '';
  if (msg.includes(CONSTRAINT_CAN_BO)) {
    return new UyVienUyBanConflictError('can_bo', '');
  }
  if (msg.includes(CONSTRAINT_MA_UV)) {
    return new UyVienUyBanConflictError('ma_uv', '');
  }
  return null;
}

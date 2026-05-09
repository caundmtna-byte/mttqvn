import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';

export interface MttqKhenThuongViewer {
  /** True ⇒ bypass: `cap_bac === 1`, quan_tri (`admin`/`all`), `role=admin`, hoặc legacy khi chưa hydrate matrix. */
  canViewAll: boolean;
  /** `var_chuc_vu.cap_quan_ly` — Tỉnh / Xã phường / null. */
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.id` — so khớp `id_nguoi_tao` quyết định. */
  viewerNhanVienId: string | null;
  /** `var_nhan_vien.don_vi_id` — so khớp `don_vi_id` cán bộ được khen (cấp Xã phường). */
  viewerDonViId: string | null;
}

/**
 * Tổng hợp viewer cho module Danh sách khen thưởng.
 *
 * `canViewAll`:
 * - `user.role === 'admin'`
 * - `!matrixActive`
 * - `var_chuc_vu.cap_bac === 1`
 * - Grant `admin` / `all` trên module khen thưởng
 *
 * Không bypass: `cap_quan_ly === 'Tỉnh'` xem hết; `'Xã phường'` xem QĐ do mình tạo hoặc có
 * người được khen thuộc cùng `don_vi_id`; còn lại không xem dòng nào.
 */
export function useMttqKhenThuongViewer(): MttqKhenThuongViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId =
      APP_RESOURCE_TO_MODULE.matTranRewardList ??
      'mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-khen-thuong';
    const allowed = grantsByModule[moduleId] ?? [];
    const canViewAll =
      user?.role === 'admin' ||
      !matrixActive ||
      isChucVuCapBacOne(chucVuCapBac) ||
      allowed.includes('admin') ||
      allowed.includes('all');
    const nv = user?.nhan_vien_id?.toString().trim();
    const dv = user?.don_vi_id?.toString().trim();
    return {
      canViewAll,
      chucVuCapQuanLy: chucVuCapQuanLy ?? null,
      viewerNhanVienId: nv ? nv : null,
      viewerDonViId: dv ? dv : null,
    };
  }, [
    user?.role,
    user?.nhan_vien_id,
    user?.don_vi_id,
    matrixActive,
    grantsByModule,
    chucVuCapBac,
    chucVuCapQuanLy,
  ]);
}

/** Dữ liệu tối thiểu để gate xem (danh sách QĐ / detail / tab Chi tiết phẳng). */
export type KhenThuongRowForViewGate = {
  id_nguoi_tao?: string | null;
  /** Danh sách QĐ — `don_vi_id` cán bộ được khen (đã chuẩn hoá). */
  rewarded_can_bo_don_vi_ids?: string[];
  /** Detail — lấy từ `chi_tiet[].can_bo_don_vi_id`. */
  chi_tiet?: { can_bo_don_vi_id?: string | null }[];
  /** Tab Chi tiết phẳng — một cán bộ / dòng. */
  can_bo_don_vi_id?: string | null;
};

function collectRewardedDonViIds(row: KhenThuongRowForViewGate): string[] {
  if (row.rewarded_can_bo_don_vi_ids?.length) return row.rewarded_can_bo_don_vi_ids;
  if (row.chi_tiet?.length) {
    const out: string[] = [];
    for (const c of row.chi_tiet) {
      const t = c.can_bo_don_vi_id?.toString().trim();
      if (t) out.push(t);
    }
    return out;
  }
  const t = row.can_bo_don_vi_id?.toString().trim();
  return t ? [t] : [];
}

/** Helper dùng cho danh sách QĐ, drawer detail và tab Chi tiết phẳng. */
export function canViewKhenThuongRow(viewer: MttqKhenThuongViewer, row: KhenThuongRowForViewGate): boolean {
  if (viewer.canViewAll) return true;
  if (viewer.chucVuCapQuanLy === 'Tỉnh') return true;

  const creator = row.id_nguoi_tao?.toString().trim();
  const createdByMe =
    Boolean(viewer.viewerNhanVienId) && Boolean(creator) && creator === viewer.viewerNhanVienId;

  if (viewer.chucVuCapQuanLy === 'Xã phường') {
    if (createdByMe) return true;
    if (!viewer.viewerDonViId) return false;
    return collectRewardedDonViIds(row).some((id) => id === viewer.viewerDonViId);
  }
  return false;
}

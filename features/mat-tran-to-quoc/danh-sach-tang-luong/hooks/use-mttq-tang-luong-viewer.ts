import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';

export interface MttqTangLuongViewer {
  /** True ⇒ bypass: `cap_bac === 1`, quan_tri (`admin`/`all`), `role=admin`, hoặc legacy khi chưa hydrate matrix. */
  canViewAll: boolean;
  /** `var_chuc_vu.cap_quan_ly` sau hydrate — Tỉnh / Xã phường / null. */
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.don_vi_id` — so khớp `mttq_can_bo.don_vi_id` khi Xã phường. */
  viewerDonViId: string | null;
}

/**
 * Viewer cho Danh sách tăng lương — lọc dòng theo `don_vi_id` cán bộ (embed từ `can_bo_id`).
 *
 * - `canViewAll` hoặc `cap_quan_ly` = **Tỉnh** → mọi dòng
 * - `cap_quan_ly` = **Xã phường** → chỉ `don_vi_id` trùng NV
 * - Khác / null → mọi dòng (chỉ cần quyền module)
 */
export function useMttqTangLuongViewer(): MttqTangLuongViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId =
      APP_RESOURCE_TO_MODULE.matTranSalaryIncreaseList ??
      'mat-tran-to-quoc/quan-ly-luong/danh-sach-tang-luong';
    const allowed = grantsByModule[moduleId] ?? [];
    const canViewAll =
      user?.role === 'admin' ||
      !matrixActive ||
      isChucVuCapBacOne(chucVuCapBac) ||
      allowed.includes('admin') ||
      allowed.includes('all');
    const dv = user?.don_vi_id?.toString().trim();
    return {
      canViewAll,
      chucVuCapQuanLy: chucVuCapQuanLy ?? null,
      viewerDonViId: dv ? dv : null,
    };
  }, [user?.role, user?.don_vi_id, matrixActive, grantsByModule, chucVuCapBac, chucVuCapQuanLy]);
}

export type TangLuongRowForViewGate = {
  /** FK `mttq_can_bo.don_vi_id` — flatten từ embed cán bộ. */
  don_vi_id?: string | null;
  /** `mttq_can_bo.cap_quan_ly` — dùng để lọc dòng cho nhân sự cấp Tỉnh. */
  can_bo_cap_quan_ly?: string[] | null;
};

/** cap_bac=1, quan_tri, admin, legacy — xem hết (Tỉnh không còn bypass). */
export function isTangLuongViewUnrestricted(viewer: MttqTangLuongViewer): boolean {
  return viewer.canViewAll;
}

/** Tỉnh (không bypass) — lọc theo `can_bo_cap_quan_ly` chứa 'Tỉnh'. */
export function isTangLuongScopedToTinh(viewer: MttqTangLuongViewer): boolean {
  return !viewer.canViewAll && viewer.chucVuCapQuanLy === 'Tỉnh';
}

/** Chỉ Xã phường (không bypass) — lọc theo `don_vi_id` cán bộ. */
export function isTangLuongScopedToXaPhuong(viewer: MttqTangLuongViewer): boolean {
  return !viewer.canViewAll && viewer.chucVuCapQuanLy === 'Xã phường';
}

export function canViewTangLuongRow(
  viewer: MttqTangLuongViewer,
  row: TangLuongRowForViewGate,
): boolean {
  if (viewer.canViewAll) return true;
  if (viewer.chucVuCapQuanLy === 'Tỉnh') {
    return (row.can_bo_cap_quan_ly ?? []).includes('Tỉnh');
  }
  if (viewer.chucVuCapQuanLy === 'Xã phường') {
    if (!viewer.viewerDonViId) return false;
    const rowDv = row.don_vi_id?.toString().trim();
    return Boolean(rowDv) && rowDv === viewer.viewerDonViId;
  }
  return true;
}

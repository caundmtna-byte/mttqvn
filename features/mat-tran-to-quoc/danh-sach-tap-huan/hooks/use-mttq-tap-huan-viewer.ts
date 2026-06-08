import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';

export interface MttqLopTapHuanViewer {
  /** True ⇒ bypass: `cap_bac === 1`, quan_tri (`admin`/`all`), `role=admin`, hoặc legacy khi chưa hydrate matrix. */
  canViewAll: boolean;
  /** `var_chuc_vu.cap_quan_ly` sau hydrate — Tỉnh / Xã phường / null. */
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.don_vi_id` — so khớp `mttq_can_bo.don_vi_id` của ứng viên khi Xã phường. */
  viewerDonViId: string | null;
}

/**
 * Tổng hợp viewer cho module Tập huấn.
 *
 * Tab **Lớp tập huấn** (`canViewLopTapHuanRow`):
 * - `canViewAll` / **Tỉnh** → hết lớp
 * - **Xã phường** → lớp cấp tỉnh/TW (`don_vi_id` null) + lớp cùng `don_vi_id` NV
 * - `cap_quan_ly` null → hết
 *
 * **Ứng viên / dòng CT** (detail lớp, tab Danh sách CT, tab Thống kê):
 * - `canViewAll` (cap_bac=1, quan_tri, admin, legacy) hoặc `cap_quan_ly` = **Tỉnh** → hết
 * - `cap_quan_ly` = **Xã phường** → chỉ dòng có `can_bo_don_vi_id` trùng `viewerDonViId`
 * - `cap_quan_ly` khác / null → hết
 */
export function useMttqLopTapHuanViewer(): MttqLopTapHuanViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId =
      APP_RESOURCE_TO_MODULE.matTranTrainingList ??
      'mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-tap-huan';
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

export type TapHuanUngVienRowForViewGate = {
  /** FK `mttq_can_bo.don_vi_id` — gating Xã phường trong detail / tab CT / thống kê. */
  can_bo_don_vi_id?: string | null;
};

/** cap_bac=1, quan_tri, admin, legacy, hoặc chức vụ Tỉnh — xem hết ứng viên. */
export function isTapHuanUngVienViewUnrestricted(viewer: MttqLopTapHuanViewer): boolean {
  return viewer.canViewAll || viewer.chucVuCapQuanLy === 'Tỉnh';
}

/** Chỉ Xã phường (không bypass) — lọc theo `can_bo.don_vi_id`. */
export function isTapHuanUngVienScopedToXaPhuong(viewer: MttqLopTapHuanViewer): boolean {
  return !isTapHuanUngVienViewUnrestricted(viewer) && viewer.chucVuCapQuanLy === 'Xã phường';
}

/** Lọc ứng viên (dòng CT) — detail lớp, tab Danh sách CT, tab Thống kê. */
export function canViewTapHuanUngVienRow(
  viewer: MttqLopTapHuanViewer,
  row: TapHuanUngVienRowForViewGate,
): boolean {
  if (isTapHuanUngVienViewUnrestricted(viewer)) return true;
  if (viewer.chucVuCapQuanLy === 'Xã phường') {
    if (!viewer.viewerDonViId) return false;
    const rowDv = row.can_bo_don_vi_id?.toString().trim();
    return Boolean(rowDv) && rowDv === viewer.viewerDonViId;
  }
  return true;
}

export type LopTapHuanRowForViewGate = {
  /** FK `mttq_lop_tap_huan.don_vi_id` — null = cấp tỉnh / TW. */
  don_vi_id?: string | null;
};

/** Gate lớp tập huấn — áp cho tab Lớp trong index.tsx và drawer chi tiết. */
export function canViewLopTapHuanRow(
  viewer: MttqLopTapHuanViewer,
  row: LopTapHuanRowForViewGate,
): boolean {
  if (viewer.canViewAll) return true;
  if (viewer.chucVuCapQuanLy === 'Tỉnh') return true;
  if (viewer.chucVuCapQuanLy === 'Xã phường') {
    const rowDv = row.don_vi_id?.toString().trim();
    if (!rowDv) return true;
    if (!viewer.viewerDonViId) return false;
    return rowDv === viewer.viewerDonViId;
  }
  return true;
}

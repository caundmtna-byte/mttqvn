import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, type AppResource, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';

export interface PbxhThucHienViewer {
  /** True ⇒ bypass: `cap_bac === 1`, quan_tri (`admin`/`all`), `role=admin`, hoặc legacy khi chưa hydrate matrix. */
  canViewAll: boolean;
  /** `var_chuc_vu.cap_quan_ly` sau hydrate — Tỉnh / Xã phường / null. */
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.don_vi_id` — so khớp `don_vi_thuc_hien_id` khi Xã phường. */
  viewerDonViId: string | null;
}

export type PbxhThucHienRowForViewGate = {
  don_vi_thuc_hien_id?: string | null;
};

type PbxhViewerResource = Extract<AppResource, 'phanBienThucHien' | 'phanBienThongKe'>;

/**
 * Tổng hợp viewer cho Kiểm tra, GS và PBXH / Thống kê PBXH.
 *
 * - `canViewAll` hoặc `cap_quan_ly` = **Tỉnh** → mọi dòng (kể cả MTTQ Tỉnh)
 * - `cap_quan_ly` = **Xã phường** → chỉ `don_vi_thuc_hien_id` trùng `viewerDonViId`; ẩn MTTQ Tỉnh (`null`)
 * - Khác / null → mọi dòng
 */
export function usePbxhThucHienViewer(
  appResource: PbxhViewerResource = 'phanBienThucHien',
): PbxhThucHienViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId =
      APP_RESOURCE_TO_MODULE[appResource] ??
      (appResource === 'phanBienThongKe'
        ? 'phan-bien-xa-hoi/thong-ke-phan-bien-xa-hoi'
        : 'phan-bien-xa-hoi/thuc-hien-phan-bien-xa-hoi');
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
  }, [appResource, user?.role, user?.don_vi_id, matrixActive, grantsByModule, chucVuCapBac, chucVuCapQuanLy]);
}

/** cap_bac=1, quan_tri, admin, legacy, hoặc chức vụ Tỉnh — xem hết. */
export function isPbxhViewUnrestricted(viewer: PbxhThucHienViewer): boolean {
  return viewer.canViewAll || viewer.chucVuCapQuanLy === 'Tỉnh';
}

/** Chỉ Xã phường (không bypass) — lọc theo `don_vi_thuc_hien_id`. */
export function isPbxhScopedToXaPhuong(viewer: PbxhThucHienViewer): boolean {
  return !isPbxhViewUnrestricted(viewer) && viewer.chucVuCapQuanLy === 'Xã phường';
}

export function canViewPbxhThucHienRow(
  viewer: PbxhThucHienViewer,
  row: PbxhThucHienRowForViewGate,
): boolean {
  if (isPbxhViewUnrestricted(viewer)) return true;
  if (viewer.chucVuCapQuanLy === 'Xã phường') {
    if (!viewer.viewerDonViId) return false;
    const rowDv = row.don_vi_thuc_hien_id?.toString().trim();
    return Boolean(rowDv) && rowDv === viewer.viewerDonViId;
  }
  return true;
}

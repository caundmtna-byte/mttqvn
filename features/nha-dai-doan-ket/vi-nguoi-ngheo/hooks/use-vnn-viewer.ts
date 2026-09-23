import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';

export interface VnnViewer {
  /** True ⇒ bypass: `cap_bac === 1`, quan_tri (`admin`/`all`), `role=admin`, hoặc chưa hydrate matrix. */
  canViewAll: boolean;
  /** `var_chuc_vu.cap_quan_ly` sau hydrate — Tỉnh / Xã phường / null. */
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.don_vi_id` — so khớp `xa_phuong_id` của khoản khi Xã phường. */
  viewerDonViId: string | null;
}

export type VnnRowForViewGate = {
  xa_phuong_id?: string | null;
};

/**
 * Phạm vi xem của Chương trình vì người nghèo — dùng chung cho tab Danh sách,
 * tab Thống kê (con số tổng cũng phải lọc, nếu không là lộ dữ liệu toàn hệ
 * thống) và RPC `get_vnn_page`.
 *
 * - `canViewAll` hoặc `cap_quan_ly` = **Tỉnh** → mọi khoản
 * - `cap_quan_ly` = **Xã phường** → chỉ khoản có `xa_phuong_id` trùng đơn vị mình
 * - Khác / null → mọi khoản
 */
export function useVnnViewer(): VnnViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId =
      APP_RESOURCE_TO_MODULE.viNguoiNgheoList ?? 'an-sinh-xa-hoi/vi-nguoi-ngheo/danh-sach';
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

/** cap_bac=1, quan_tri, admin, chưa hydrate, hoặc chức vụ Tỉnh — xem hết. */
export function isVnnViewUnrestricted(viewer: VnnViewer): boolean {
  return viewer.canViewAll || viewer.chucVuCapQuanLy === 'Tỉnh';
}

/** Chỉ Xã phường (không bypass) — lọc theo `xa_phuong_id`. */
export function isVnnScopedToXaPhuong(viewer: VnnViewer): boolean {
  return !isVnnViewUnrestricted(viewer) && viewer.chucVuCapQuanLy === 'Xã phường';
}

/** Tham số phạm vi cho RPC — PHẢI khớp `canViewVnnRow`. */
export function vnnViewerRpcScope(viewer: VnnViewer): {
  viewAll: boolean;
  viewerXaPhuongId: string | null;
} {
  const scoped = isVnnScopedToXaPhuong(viewer);
  return { viewAll: !scoped, viewerXaPhuongId: scoped ? viewer.viewerDonViId : null };
}

export function canViewVnnRow(viewer: VnnViewer, row: VnnRowForViewGate): boolean {
  if (!isVnnScopedToXaPhuong(viewer)) return true;
  // Cán bộ cấp xã chưa được gán đơn vị thấy RỖNG — nới lỏng ở đây là để lọt
  // toàn bộ khoản của mọi xã cho một tài khoản cấu hình thiếu.
  if (!viewer.viewerDonViId) return false;
  const rowXa = row.xa_phuong_id?.toString().trim();
  return Boolean(rowXa) && rowXa === viewer.viewerDonViId;
}

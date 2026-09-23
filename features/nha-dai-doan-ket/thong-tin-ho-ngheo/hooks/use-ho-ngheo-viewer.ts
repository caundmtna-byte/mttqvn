import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';

export interface HoNgheoViewer {
  /** True ⇒ bypass: `cap_bac === 1`, quan_tri (`admin`/`all`), `role=admin`, hoặc chưa hydrate matrix. */
  canViewAll: boolean;
  /** `var_chuc_vu.cap_quan_ly` sau hydrate — Tỉnh / Xã phường / null. */
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.don_vi_id` — so khớp `xa_phuong_id` của hộ khi Xã phường. */
  viewerDonViId: string | null;
}

export type HoNgheoRowForViewGate = {
  xa_phuong_id?: string | null;
};

/**
 * Phạm vi xem của module Thông tin hộ nghèo.
 *
 * - `canViewAll` hoặc `cap_quan_ly` = **Tỉnh** → mọi hộ
 * - `cap_quan_ly` = **Xã phường** → chỉ hộ có `xa_phuong_id` trùng đơn vị mình
 * - Khác / null → mọi hộ
 *
 * Bản sao của luật này nằm trong RPC `get_hngh_page` (tham số `p_view_all` /
 * `p_viewer_xa_phuong_id`) — sửa một bên phải sửa cả bên kia.
 */
export function useHoNgheoViewer(): HoNgheoViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId =
      APP_RESOURCE_TO_MODULE.hoNgheoList ?? 'an-sinh-xa-hoi/thong-tin-ho-ngheo/danh-sach';
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
export function isHoNgheoViewUnrestricted(viewer: HoNgheoViewer): boolean {
  return viewer.canViewAll || viewer.chucVuCapQuanLy === 'Tỉnh';
}

/** Chỉ Xã phường (không bypass) — lọc theo `xa_phuong_id`. */
export function isHoNgheoScopedToXaPhuong(viewer: HoNgheoViewer): boolean {
  return !isHoNgheoViewUnrestricted(viewer) && viewer.chucVuCapQuanLy === 'Xã phường';
}

export function canViewHoNgheoRow(viewer: HoNgheoViewer, row: HoNgheoRowForViewGate): boolean {
  if (isHoNgheoViewUnrestricted(viewer)) return true;
  if (viewer.chucVuCapQuanLy === 'Xã phường') {
    // Cán bộ cấp xã chưa được gán đơn vị thấy RỖNG — nới lỏng ở đây là để lọt
    // toàn bộ hộ của mọi xã cho một tài khoản cấu hình thiếu.
    if (!viewer.viewerDonViId) return false;
    const rowXa = row.xa_phuong_id?.toString().trim();
    return Boolean(rowXa) && rowXa === viewer.viewerDonViId;
  }
  return true;
}

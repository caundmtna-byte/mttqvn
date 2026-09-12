import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, type AppResource, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';

export interface NddkViewer {
  /** True ⇒ bypass: `cap_bac === 1`, quan_tri (`admin`/`all`), `role=admin`, hoặc chưa hydrate matrix. */
  canViewAll: boolean;
  /** `var_chuc_vu.cap_quan_ly` sau hydrate — Tỉnh / Xã phường / null. */
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.don_vi_id` — so khớp `xa_phuong_id` của hồ sơ khi Xã phường. */
  viewerDonViId: string | null;
}

export type NddkRowForViewGate = {
  xa_phuong_id?: string | null;
};

type NddkViewerResource = Extract<AppResource, 'nhaDaiDoanKetList' | 'nhaDaiDoanKetThongKe'>;

/**
 * Phạm vi xem của module Nhà đại đoàn kết — dùng chung cho trang Danh sách và
 * trang Thống kê (trang thống kê bắt buộc áp cùng luật, nếu không là lộ dữ liệu
 * toàn hệ thống qua các con số tổng hợp).
 *
 * - `canViewAll` hoặc `cap_quan_ly` = **Tỉnh** → mọi hồ sơ
 * - `cap_quan_ly` = **Xã phường** → chỉ hồ sơ có `xa_phuong_id` trùng đơn vị mình
 * - Khác / null → mọi hồ sơ
 */
export function useNddkViewer(appResource: NddkViewerResource = 'nhaDaiDoanKetList'): NddkViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId =
      APP_RESOURCE_TO_MODULE[appResource] ??
      (appResource === 'nhaDaiDoanKetThongKe'
        ? 'an-sinh-xa-hoi/nha-dai-doan-ket/thong-ke'
        : 'an-sinh-xa-hoi/nha-dai-doan-ket/danh-sach');
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
  }, [
    appResource,
    user?.role,
    user?.don_vi_id,
    matrixActive,
    grantsByModule,
    chucVuCapBac,
    chucVuCapQuanLy,
  ]);
}

/** cap_bac=1, quan_tri, admin, chưa hydrate, hoặc chức vụ Tỉnh — xem hết. */
export function isNddkViewUnrestricted(viewer: NddkViewer): boolean {
  return viewer.canViewAll || viewer.chucVuCapQuanLy === 'Tỉnh';
}

/** Chỉ Xã phường (không bypass) — lọc theo `xa_phuong_id`. */
export function isNddkScopedToXaPhuong(viewer: NddkViewer): boolean {
  return !isNddkViewUnrestricted(viewer) && viewer.chucVuCapQuanLy === 'Xã phường';
}

export function canViewNddkRow(viewer: NddkViewer, row: NddkRowForViewGate): boolean {
  if (isNddkViewUnrestricted(viewer)) return true;
  if (viewer.chucVuCapQuanLy === 'Xã phường') {
    // Cán bộ cấp xã chưa được gán đơn vị thấy RỖNG — nới lỏng ở đây là để lọt
    // toàn bộ hồ sơ của mọi xã cho một tài khoản cấu hình thiếu.
    if (!viewer.viewerDonViId) return false;
    const rowXa = row.xa_phuong_id?.toString().trim();
    return Boolean(rowXa) && rowXa === viewer.viewerDonViId;
  }
  return true;
}

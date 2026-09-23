import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';

export interface KtntViewer {
  /** True ⇒ bypass: `cap_bac === 1`, quan_tri (`admin`/`all`), `role=admin`, hoặc chưa hydrate matrix. */
  canViewAll: boolean;
  /** `var_chuc_vu.cap_quan_ly` sau hydrate — Tỉnh / Xã phường / null. */
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.don_vi_id` — so khớp `xa_phuong_id` của quyết định khi Xã phường. */
  viewerDonViId: string | null;
}

export type KtntRowForViewGate = {
  xa_phuong_id?: string | null;
};

/**
 * Phạm vi xem của Khen thưởng nhà tài trợ — dùng chung cho tab Danh sách, tab
 * Thống kê và RPC `get_ktnt_page`.
 *
 * - `canViewAll` hoặc `cap_quan_ly` = **Tỉnh** → mọi quyết định
 * - `cap_quan_ly` = **Xã phường** → chỉ quyết định khen CẤP XÃ của xã mình
 *   (quyết định cấp tỉnh / trung ương có `xa_phuong_id` NULL nên không lọt)
 * - Khác / null → mọi quyết định
 */
export function useKtntViewer(): KtntViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId =
      APP_RESOURCE_TO_MODULE.khenThuongNhaTaiTroList ??
      'an-sinh-xa-hoi/khen-thuong-nha-tai-tro/danh-sach';
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
export function isKtntViewUnrestricted(viewer: KtntViewer): boolean {
  return viewer.canViewAll || viewer.chucVuCapQuanLy === 'Tỉnh';
}

/** Chỉ Xã phường (không bypass) — lọc theo `xa_phuong_id`. */
export function isKtntScopedToXaPhuong(viewer: KtntViewer): boolean {
  return !isKtntViewUnrestricted(viewer) && viewer.chucVuCapQuanLy === 'Xã phường';
}

/** Tham số phạm vi cho RPC — PHẢI khớp `canViewKtntRow`. */
export function ktntViewerRpcScope(viewer: KtntViewer): {
  viewAll: boolean;
  viewerXaPhuongId: string | null;
} {
  const scoped = isKtntScopedToXaPhuong(viewer);
  return { viewAll: !scoped, viewerXaPhuongId: scoped ? viewer.viewerDonViId : null };
}

export function canViewKtntRow(viewer: KtntViewer, row: KtntRowForViewGate): boolean {
  if (!isKtntScopedToXaPhuong(viewer)) return true;
  // Cán bộ cấp xã chưa được gán đơn vị thấy RỖNG — nới lỏng ở đây là để lọt
  // toàn bộ quyết định của mọi xã cho một tài khoản cấu hình thiếu.
  if (!viewer.viewerDonViId) return false;
  const rowXa = row.xa_phuong_id?.toString().trim();
  return Boolean(rowXa) && rowXa === viewer.viewerDonViId;
}

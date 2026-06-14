import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, type AppResource, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';

export interface DttgViewer {
  /** True ⇒ bypass: `cap_bac === 1`, quan_tri (`admin`/`all`), `role=admin`, hoặc legacy khi chưa hydrate matrix. */
  canViewAll: boolean;
  /** `cap_quan_ly` sau hydrate — Tỉnh / Xã phường / null. */
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.don_vi_id` — so khớp đơn vị dòng khi Xã phường. */
  viewerDonViId: string | null;
}

export type DttgAppResource =
  | 'danTocDipThamHoi'
  | 'danTocThamHoiToChuc'
  | 'danTocThamHoiCaNhan'
  | 'danTocThamHoiThongKe'
  | 'danTocToChucQuanTrong'
  | 'danTocCaNhanTieuBieu'
  | 'danTocThongKeToChucCaNhan';

export function useDttgViewer(appResource: DttgAppResource): DttgViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId = APP_RESOURCE_TO_MODULE[appResource as AppResource] ?? '';
    const allowed = moduleId ? (grantsByModule[moduleId] ?? []) : [];
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

/** cap_bac=1, quan_tri, admin, legacy, hoặc chức vụ Tỉnh — xem/sửa/xóa mọi dòng trong phạm vi module. */
export function isDttgViewUnrestricted(viewer: DttgViewer): boolean {
  return viewer.canViewAll || viewer.chucVuCapQuanLy === 'Tỉnh';
}

/** Chỉ Xã phường (không bypass) — lọc và chặn sửa/xóa theo đơn vị. */
export function isDttgScopedToXaPhuong(viewer: DttgViewer): boolean {
  return !isDttgViewUnrestricted(viewer) && viewer.chucVuCapQuanLy === 'Xã phường';
}

/**
 * Xem dòng theo đơn vị:
 * - bypass / Tỉnh → true
 * - Xã phường → true nếu MỘT trong `donViIds` khớp `viewerDonViId` (null/empty bị loại)
 * - cap null → true
 */
export function dttgRowVisibleByDonVi(
  viewer: DttgViewer,
  donViIds: Array<string | null | undefined>,
): boolean {
  if (isDttgViewUnrestricted(viewer)) return true;
  if (viewer.chucVuCapQuanLy === 'Xã phường') {
    if (!viewer.viewerDonViId) return false;
    return donViIds.some((id) => {
      const rowDv = id?.toString().trim();
      return Boolean(rowDv) && rowDv === viewer.viewerDonViId;
    });
  }
  return true;
}

/** Cấp Xã phường chỉ sửa/xóa dòng thuộc đơn vị mình; các cấp khác theo quyền module. */
export function canMutateDttgRowByDonVi(
  viewer: DttgViewer,
  donViIds: Array<string | null | undefined>,
): boolean {
  if (!isDttgScopedToXaPhuong(viewer)) return true;
  return dttgRowVisibleByDonVi(viewer, donViIds);
}

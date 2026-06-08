import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';

export interface KhoNhapXuatKhoViewer {
  /** True ⇒ bypass: `cap_bac === 1`, quan_tri (`admin`/`all`), `role=admin`, hoặc legacy khi chưa hydrate matrix. */
  canViewAll: boolean;
  /** `var_chuc_vu.cap_quan_ly` sau hydrate — Tỉnh / Xã phường / null. */
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.don_vi_id` — so khớp `kho_danh_sach_kho.don_vi_id` khi Xã phường. */
  viewerDonViId: string | null;
}

export type NhapXuatKhoRowForViewGate = {
  kho_xuat_don_vi_id?: string | null;
  kho_nhap_don_vi_id?: string | null;
};

/**
 * Tổng hợp viewer cho Nhập xuất kho.
 *
 * - `canViewAll` hoặc `cap_quan_ly` = **Tỉnh** → mọi phiếu
 * - `cap_quan_ly` = **Xã phường** → phiếu có kho xuất HOẶC kho nhập thuộc `don_vi_id` của viewer
 * - Khác / null → mọi phiếu
 */
export function useKhoNhapXuatKhoViewer(): KhoNhapXuatKhoViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId =
      APP_RESOURCE_TO_MODULE.matTranReliefStockTransactions ??
      'mat-tran-to-quoc/kho-cuu-tro/nhap-xuat-kho';
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

/** cap_bac=1, quan_tri, admin, legacy, hoặc chức vụ Tỉnh — xem hết phiếu. */
export function isNhapXuatKhoViewUnrestricted(viewer: KhoNhapXuatKhoViewer): boolean {
  return viewer.canViewAll || viewer.chucVuCapQuanLy === 'Tỉnh';
}

export function canViewNhapXuatKhoRow(
  viewer: KhoNhapXuatKhoViewer,
  row: NhapXuatKhoRowForViewGate,
): boolean {
  if (isNhapXuatKhoViewUnrestricted(viewer)) return true;
  if (viewer.chucVuCapQuanLy === 'Xã phường') {
    if (!viewer.viewerDonViId) return false;
    const dv = viewer.viewerDonViId;
    const xuatDv = row.kho_xuat_don_vi_id?.toString().trim();
    const nhapDv = row.kho_nhap_don_vi_id?.toString().trim();
    return xuatDv === dv || nhapDv === dv;
  }
  return true;
}

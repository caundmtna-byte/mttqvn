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
  /** `var_nhan_vien.id` — so khớp `id_nguoi_tao` cán bộ / quyết định. */
  viewerNhanVienId: string | null;
  /** `var_nhan_vien.don_vi_id` — so khớp `don_vi_id` cán bộ được khen (cấp Xã phường). */
  viewerDonViId: string | null;
}

/**
 * Tổng hợp viewer cho module Khen thưởng.
 *
 * Tab **Danh sách QĐ**, **Chi tiết phẳng**, **Thống kê**: `Tỉnh` / `Xã phường` / bypass xem hết.
 *
 * **Drawer detail — bảng con**: Xã phường chỉ dòng có cán bộ do mình tạo (`mttq_can_bo.id_nguoi_tao`)
 * hoặc `can_bo.don_vi_id` trùng đơn vị NV.
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

/** Dữ liệu tối thiểu để gate xem danh sách QĐ / tab Chi tiết phẳng. */
export type KhenThuongRowForViewGate = {
  id_nguoi_tao?: string | null;
};

/** Dòng bảng con trong drawer detail. */
export type KhenThuongDetailChiTietLineForViewGate = {
  can_bo_don_vi_id?: string | null;
  /** `mttq_can_bo.id_nguoi_tao` */
  can_bo_id_nguoi_tao?: string | null;
};

function isKhenThuongModuleViewUnrestricted(viewer: MttqKhenThuongViewer): boolean {
  return (
    viewer.canViewAll ||
    viewer.chucVuCapQuanLy === 'Tỉnh' ||
    viewer.chucVuCapQuanLy === 'Xã phường'
  );
}

/** Tab Danh sách QĐ — ai có quyền module và cap Tỉnh / Xã phường xem hết QĐ. */
export function canViewKhenThuongRow(
  viewer: MttqKhenThuongViewer,
  _row: KhenThuongRowForViewGate,
): boolean {
  if (isKhenThuongModuleViewUnrestricted(viewer)) return true;
  return false;
}

/** Tab Chi tiết phẳng — cùng phạm vi với tab Danh sách QĐ. */
export function canViewKhenThuongChiTietRow(
  viewer: MttqKhenThuongViewer,
  _row: KhenThuongRowForViewGate,
): boolean {
  return canViewKhenThuongRow(viewer, _row);
}

/** Bảng con trong drawer detail — Xã phường lọc theo cán bộ. */
export function canViewKhenThuongDetailChiTietLine(
  viewer: MttqKhenThuongViewer,
  line: KhenThuongDetailChiTietLineForViewGate,
): boolean {
  if (viewer.canViewAll || viewer.chucVuCapQuanLy === 'Tỉnh') return true;
  if (viewer.chucVuCapQuanLy === 'Xã phường') {
    const canBoCreator = line.can_bo_id_nguoi_tao?.toString().trim();
    const createdCanBoByMe =
      Boolean(viewer.viewerNhanVienId) && Boolean(canBoCreator) && canBoCreator === viewer.viewerNhanVienId;
    if (createdCanBoByMe) return true;
    if (!viewer.viewerDonViId) return false;
    const rowDv = line.can_bo_don_vi_id?.toString().trim();
    return Boolean(rowDv) && rowDv === viewer.viewerDonViId;
  }
  return true;
}

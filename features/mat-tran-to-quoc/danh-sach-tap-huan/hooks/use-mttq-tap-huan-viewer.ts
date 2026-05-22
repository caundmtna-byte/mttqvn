import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';
import type { MttqTapHuanCap } from '../core/constants';

export interface MttqLopTapHuanViewer {
  /** True ⇒ bypass: `cap_bac === 1`, quan_tri (`admin`/`all`), `role=admin`, hoặc legacy khi chưa hydrate matrix. */
  canViewAll: boolean;
  /** `var_chuc_vu.cap_quan_ly` sau hydrate — Tỉnh / Xã phường / null. */
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.don_vi_id` — so khớp `mttq_lop_tap_huan.don_vi_id` khi lớp Cấp xã. */
  viewerDonViId: string | null;
}

/**
 * Tổng hợp viewer cho module Tập huấn (tab lớp + Danh sách CT).
 *
 * `canViewAll`:
 * - `user.role === 'admin'`
 * - `!matrixActive` (legacy, không ẩn dữ liệu khi chưa hydrate)
 * - `var_chuc_vu.cap_bac === 1`
 * - Grant `admin` / `all` (map từ `quan_tri`) trên module tập huấn
 *
 * Không bypass: theo `cap_tap_huan` của lớp và `cap_quan_ly` chức vụ —
 * Cấp tỉnh chỉ Tỉnh; Cấp xã là Tỉnh hoặc Xã phường (có `don_vi_id` NV) khớp `don_vi_id` lớp.
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

export type LopTapHuanRowForViewGate = {
  cap_tap_huan: MttqTapHuanCap;
  don_vi_id?: string | null;
};

/** Helper rút gọn dùng cho cả danh sách lớp, tab CT và detail (thuần hàm — dễ unit test). */
export function canViewLopTapHuanRow(viewer: MttqLopTapHuanViewer, row: LopTapHuanRowForViewGate): boolean {
  if (viewer.canViewAll) return true;
  const cap = row.cap_tap_huan;
  if (cap === 'Cấp tỉnh') {
    return viewer.chucVuCapQuanLy === 'Tỉnh';
  }
  if (cap === 'Cấp xã') {
    if (viewer.chucVuCapQuanLy === 'Tỉnh') return true;
    if (viewer.chucVuCapQuanLy === 'Xã phường') {
      if (!viewer.viewerDonViId) return false;
      const rowDv = row.don_vi_id?.toString().trim();
      return Boolean(rowDv) && rowDv === viewer.viewerDonViId;
    }
    return false;
  }
  return false;
}

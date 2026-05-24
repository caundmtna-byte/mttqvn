import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, type AppResource, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';

export interface MttqCanBoViewer {
  /** True ⇒ bypass: `cap_bac === 1`, quan_tri (`admin`/`all`), `role=admin`, hoặc legacy khi chưa hydrate matrix. */
  canViewAll: boolean;
  /** `var_chuc_vu.cap_quan_ly` sau hydrate — Tỉnh / Xã phường / null. */
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.don_vi_id` — so khớp `mttq_can_bo.don_vi_id` khi Xã phường. */
  viewerDonViId: string | null;
}

export type CanBoRowForViewGate = {
  don_vi_id?: string | null;
};

/**
 * Tổng hợp viewer cho Danh sách cán bộ / Báo cáo cán bộ.
 *
 * - `canViewAll` hoặc `cap_quan_ly` = **Tỉnh** → mọi dòng
 * - `cap_quan_ly` = **Xã phường** → chỉ `mttq_can_bo.don_vi_id` trùng `viewerDonViId`
 * - Khác / null → mọi dòng (giống ứng viên Tập huấn khi không Xã)
 */
export function useMttqCanBoViewer(
  appResource: Extract<AppResource, 'matTranOfficerList' | 'matTranOfficerStats'> = 'matTranOfficerList',
): MttqCanBoViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId =
      APP_RESOURCE_TO_MODULE[appResource] ??
      (appResource === 'matTranOfficerStats'
        ? 'mat-tran-to-quoc/thiet-lap-khac/bao-cao-can-bo'
        : 'mat-tran-to-quoc/thiet-lap-khac/danh-sach-can-bo');
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

/** cap_bac=1, quan_tri, admin, legacy, hoặc chức vụ Tỉnh — xem hết cán bộ. */
export function isCanBoViewUnrestricted(viewer: MttqCanBoViewer): boolean {
  return viewer.canViewAll || viewer.chucVuCapQuanLy === 'Tỉnh';
}

/** Chỉ Xã phường (không bypass) — lọc theo `mttq_can_bo.don_vi_id`. */
export function isCanBoScopedToXaPhuong(viewer: MttqCanBoViewer): boolean {
  return !isCanBoViewUnrestricted(viewer) && viewer.chucVuCapQuanLy === 'Xã phường';
}

export function canViewCanBoRow(viewer: MttqCanBoViewer, row: CanBoRowForViewGate): boolean {
  if (isCanBoViewUnrestricted(viewer)) return true;
  if (viewer.chucVuCapQuanLy === 'Xã phường') {
    if (!viewer.viewerDonViId) return false;
    const rowDv = row.don_vi_id?.toString().trim();
    return Boolean(rowDv) && rowDv === viewer.viewerDonViId;
  }
  return true;
}

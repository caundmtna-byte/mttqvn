import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';
import type { KhoDanhSachKhoListRow } from '../../danh-sach-kho/core/types';

export interface KhoTonKhoViewer {
  /** True ⇒ bypass: `cap_bac === 1`, quan_tri (`admin`/`all`), `role=admin`, hoặc legacy khi chưa hydrate matrix. */
  canViewAll: boolean;
  /** `var_chuc_vu.cap_quan_ly` sau hydrate — Tỉnh / Xã phường / null. */
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.don_vi_id` — so khớp `kho_danh_sach_kho.don_vi_id` khi Xã phường. */
  viewerDonViId: string | null;
}

/**
 * Tổng hợp viewer cho Tồn kho.
 *
 * - `canViewAll` hoặc `cap_quan_ly` = **Tỉnh** → mọi kho
 * - `cap_quan_ly` = **Xã phường** → chỉ kho thuộc `don_vi_id` của viewer
 * - Khác / null → mọi kho
 */
export function useKhoTonKhoViewer(): KhoTonKhoViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId =
      APP_RESOURCE_TO_MODULE.matTranReliefInventory ?? 'an-sinh-xa-hoi/kho-cuu-tro/ton-kho';
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

/** cap_bac=1, quan_tri, admin, legacy, hoặc chức vụ Tỉnh — xem hết kho. */
export function isTonKhoViewUnrestricted(viewer: KhoTonKhoViewer): boolean {
  return viewer.canViewAll || viewer.chucVuCapQuanLy === 'Tỉnh';
}

/**
 * Tập `kho_id` mà viewer được phép thấy.
 * Trả `null` = không giới hạn (xem hết).
 */
export function getViewerKhoIds(
  viewer: KhoTonKhoViewer,
  khoList: readonly KhoDanhSachKhoListRow[],
): string[] | null {
  if (isTonKhoViewUnrestricted(viewer)) return null;
  if (viewer.chucVuCapQuanLy !== 'Xã phường') return null;
  if (!viewer.viewerDonViId) return [];
  const dv = viewer.viewerDonViId;
  return khoList
    .filter((k) => String(k.don_vi_id ?? '').trim() === dv)
    .map((k) => k.id);
}

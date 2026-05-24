import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { ChuongTrinhNamListRow } from '../core/types';

export interface ChuongTrinhNamViewer {
  /** True ⇒ bypass: `cap_bac === 1`, quan_tri (`admin`/`all`), `role=admin`, hoặc legacy khi `!matrixActive`. */
  viewAll: boolean;
  /** `var_nhan_vien.id` — so khớp `id_nguoi_tao`. */
  viewerNhanVienId: string | null;
}

export type ChuongTrinhNamRowForViewGate = Pick<ChuongTrinhNamListRow, 'id_nguoi_tao'>;

/**
 * Tổng hợp viewer cho module Chương trình BTT (lọc UI, không RLS).
 *
 * `viewAll`: admin mock, legacy (!matrixActive), `cap_bac === 1`, hoặc grant `admin`/`all` trên module.
 *
 * Khi không `viewAll`: chỉ dòng do mình tạo (`id_nguoi_tao`).
 */
export function useChuongTrinhNamViewer(): ChuongTrinhNamViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);

  return useMemo(() => {
    const moduleId =
      APP_RESOURCE_TO_MODULE.annualPrograms ?? 'quan-ly-giao-viec/chuong-trinh-nam';
    const allowed = grantsByModule[moduleId] ?? [];
    const viewAll =
      user?.role === 'admin' ||
      !matrixActive ||
      isChucVuCapBacOne(chucVuCapBac) ||
      allowed.includes('admin') ||
      allowed.includes('all');
    const nv = user?.nhan_vien_id?.toString().trim();
    return {
      viewAll,
      viewerNhanVienId: nv ? nv : null,
    };
  }, [user?.role, user?.nhan_vien_id, matrixActive, grantsByModule, chucVuCapBac]);
}

export function canViewChuongTrinhNamRow(
  viewer: ChuongTrinhNamViewer,
  row: ChuongTrinhNamRowForViewGate,
): boolean {
  if (viewer.viewAll) return true;
  const creator = row.id_nguoi_tao?.toString().trim();
  return Boolean(viewer.viewerNhanVienId) && Boolean(creator) && creator === viewer.viewerNhanVienId;
}

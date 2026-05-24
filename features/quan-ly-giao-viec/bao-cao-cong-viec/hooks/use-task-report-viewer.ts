import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';

/** Resolve giá trị bigint hợp lệ từ id dạng string/number (Supabase trả bigint as string). */
function toBigintOrNull(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

export interface TaskReportViewer {
  /** `var_nhan_vien.id` (bigint) hoặc null nếu chưa map / mock mode. */
  viewerId: number | null;
  /** `var_nhan_vien.don_vi_id` của viewer hoặc null. */
  viewerDonViId: number | null;
  /** True ⇒ bypass mọi gating: cap_bac=1, Tỉnh, quan_tri/admin, mock admin, hoặc legacy mode. */
  viewAll: boolean;
}

/**
 * Tổng hợp viewer cho RPC `cong_viec_bao_cao_*`.
 *
 * Quy tắc `viewAll`:
 * - `user.role === 'admin'`: mock admin xem hết.
 * - `!matrixActive`: chế độ legacy (chưa hydrate matrix).
 * - `cap_bac === 1`: cấp lãnh đạo bypass.
 * - `cap_quan_ly === 'Tỉnh'`: xem toàn tỉnh.
 * - Token `admin` / `all` (map từ `quan_tri`) trong grants của module báo cáo.
 *
 * Còn lại (Xã phường): filter theo đơn vị trách nhiệm OR id_nguoi_tao OR ids_ho_tro OR id_trach_nhiem.
 */
export function useTaskReportViewer(): TaskReportViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId = APP_RESOURCE_TO_MODULE.taskReports ?? 'quan-ly-giao-viec/bao-cao-cong-viec';
    const allowed = grantsByModule[moduleId] ?? [];
    const capQuanLy = chucVuCapQuanLy ?? null;
    const viewAll =
      user?.role === 'admin' ||
      !matrixActive ||
      isChucVuCapBacOne(chucVuCapBac) ||
      allowed.includes('admin') ||
      allowed.includes('all') ||
      capQuanLy === 'Tỉnh';

    return {
      viewerId: toBigintOrNull(user?.nhan_vien_id),
      viewerDonViId: toBigintOrNull(user?.don_vi_id),
      viewAll,
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

import { useMemo } from 'react';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { APP_RESOURCE_TO_MODULE } from '@/lib/permissions';

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
  /** `var_nhan_vien.id_phong_ban` của viewer hoặc null. */
  viewerPhongBanId: number | null;
  /** True ⇒ bypass mọi gating: cap_bac=1, quan_tri/admin, mock admin, hoặc legacy mode. */
  viewAll: boolean;
}

/**
 * Tổng hợp viewer cho RPC `cong_viec_bao_cao_*`.
 *
 * Quy tắc `viewAll`:
 * - `user.role === 'admin'`: mock admin xem hết.
 * - `!matrixActive`: chế độ legacy (chưa hydrate matrix) — giữ trải nghiệm cũ.
 * - `chucVuCapBac === 1`: cấp lãnh đạo bypass.
 * - Token `admin` / `all` (map từ `quan_tri`) trong grants của module `bao-cao-cong-viec`.
 *
 * Còn lại: filter theo phòng ban (qua trách nhiệm) OR id_nguoi_tao OR ids_ho_tro.
 */
export function useTaskReportViewer(): TaskReportViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);

  return useMemo(() => {
    const moduleId = APP_RESOURCE_TO_MODULE.taskReports ?? 'quan-ly-giao-viec/bao-cao-cong-viec';
    const allowed = grantsByModule[moduleId] ?? [];
    const viewAll =
      user?.role === 'admin' ||
      !matrixActive ||
      chucVuCapBac === 1 ||
      allowed.includes('admin') ||
      allowed.includes('all');

    return {
      viewerId: toBigintOrNull(user?.nhan_vien_id),
      viewerPhongBanId: toBigintOrNull(user?.id_phong_ban),
      viewAll,
    };
  }, [user?.role, user?.nhan_vien_id, user?.id_phong_ban, matrixActive, grantsByModule, chucVuCapBac]);
}

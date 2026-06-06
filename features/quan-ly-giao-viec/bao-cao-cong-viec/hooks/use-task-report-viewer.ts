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
  /** `var_nhan_vien.id_phong_ban` của viewer — lọc Tỉnh theo phòng ban (thay thế bypass). */
  viewerPhongBanId: number | null;
  /** True ⇒ bypass mọi gating: cap_bac=1, quan_tri/admin, mock admin, hoặc legacy mode. */
  viewAll: boolean;
}

/**
 * Tổng hợp viewer cho RPC `cong_viec_bao_cao_*`.
 *
 * Quy tắc `viewAll`:
 * - `user.role === 'admin'`: mock admin xem hết.
 * - `!matrixActive`: chế độ legacy (chưa hydrate matrix).
 * - `cap_bac === 1`: cấp lãnh đạo bypass.
 * - Token `admin` / `all` (map từ `quan_tri`) trong grants của module báo cáo.
 *
 * Khi không bypass:
 * - Tỉnh: RPC lọc theo `p_viewer_phong_ban_id` (phòng ban của trách nhiệm).
 * - Xã phường: RPC lọc theo `p_viewer_don_vi_id` (đơn vị của trách nhiệm).
 * - Cá nhân: RPC lọc creator / support / assignee qua `p_viewer_id`.
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
      isChucVuCapBacOne(chucVuCapBac) ||
      allowed.includes('admin') ||
      allowed.includes('all');

    return {
      viewerId: toBigintOrNull(user?.nhan_vien_id),
      viewerDonViId: toBigintOrNull(user?.don_vi_id),
      viewerPhongBanId: toBigintOrNull(user?.id_phong_ban),
      viewAll,
    };
  }, [
    user?.role,
    user?.nhan_vien_id,
    user?.don_vi_id,
    user?.id_phong_ban,
    matrixActive,
    grantsByModule,
    chucVuCapBac,
  ]);
}

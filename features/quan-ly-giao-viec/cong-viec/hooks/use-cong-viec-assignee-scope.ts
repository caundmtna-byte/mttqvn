import { useMemo } from 'react';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { APP_RESOURCE_TO_MODULE } from '@/lib/permissions';

export interface CongViecAssigneeScope {
  /**
   * True ⇒ bypass mọi gating (chọn trách nhiệm/hỗ trợ trên toàn bộ user):
   * - mock admin (`user.role === 'admin'`)
   * - chế độ legacy (`!matrixActive`)
   * - chức vụ `cap_bac === 1`
   * - quyền `quan_tri` (token `admin`/`all`) trên module `tasks`.
   */
  canSelectAll: boolean;
  /** `var_nhan_vien.id_phong_ban` của viewer hiện tại (string), hoặc null. */
  viewerPhongBanId: string | null;
}

/**
 * Phạm vi chọn `id_trach_nhiem` / `ids_ho_tro` trong form Công việc.
 * Nếu `canSelectAll = false`, UI chỉ cho chọn user cùng `id_phong_ban` viewer.
 */
export function useCongViecAssigneeScope(): CongViecAssigneeScope {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);

  return useMemo(() => {
    const moduleId = APP_RESOURCE_TO_MODULE.tasks ?? 'quan-ly-giao-viec/cong-viec';
    const allowed = grantsByModule[moduleId] ?? [];
    const canSelectAll =
      user?.role === 'admin' ||
      !matrixActive ||
      chucVuCapBac === 1 ||
      allowed.includes('admin') ||
      allowed.includes('all');

    const phongBan = user?.id_phong_ban;
    const viewerPhongBanId =
      phongBan == null || String(phongBan).trim() === '' ? null : String(phongBan);

    return { canSelectAll, viewerPhongBanId };
  }, [user?.role, user?.id_phong_ban, matrixActive, grantsByModule, chucVuCapBac]);
}

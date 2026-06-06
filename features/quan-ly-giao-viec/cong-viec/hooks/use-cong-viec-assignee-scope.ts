import { useMemo } from 'react';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';

export interface CongViecAssigneeScope {
  /**
   * True ⇒ bypass mọi gating (chọn trách nhiệm/hỗ trợ trên toàn bộ user):
   * - mock admin (`user.role === 'admin'`)
   * - chế độ legacy (`!matrixActive`)
   * - chức vụ `cap_bac === 1`
   * - quyền `quan_tri` (token `admin`/`all`) trên module `tasks`
   */
  canSelectAll: boolean;
  /** `var_chuc_vu.cap_quan_ly` sau hydrate — Tỉnh / Xã phường / null. */
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.don_vi_id` của viewer — so khớp NV khi cấp Xã phường. */
  viewerDonViId: string | null;
  /** `var_nhan_vien.id_phong_ban` của viewer — so khớp NV khi cấp Tỉnh (không bypass). */
  viewerPhongBanId: string | null;
}

export type CongViecAssigneeSelectableOpts = {
  viewerNhanVienId?: string;
  savedTrachNhiemId?: string;
  savedHoTroIds?: string[];
};

function sameId(a: string | null | undefined, b: string | null | undefined): boolean {
  const sa = a?.toString().trim();
  const sb = b?.toString().trim();
  return Boolean(sa) && Boolean(sb) && sa === sb;
}

/** @deprecated alias — dùng `sameId` trực tiếp trong code mới. */
const sameDonViId = sameId;

function isAssigneeException(
  employeeId: string,
  opts?: CongViecAssigneeSelectableOpts,
): boolean {
  const id = String(employeeId);
  const viewerId = opts?.viewerNhanVienId?.trim();
  if (viewerId && id === viewerId) return true;
  const savedTrach = opts?.savedTrachNhiemId?.trim();
  if (savedTrach && id === savedTrach) return true;
  if (opts?.savedHoTroIds?.some((hid) => String(hid) === id)) return true;
  return false;
}

/**
 * Có được hiển thị trong combobox Trách nhiệm / Hỗ trợ hay không (thuần hàm — dễ unit test).
 *
 * - bypass (`canSelectAll`) → hiện tất cả
 * - exception (viewer, saved trách nhiệm, saved hỗ trợ) → luôn hiện
 * - `Xã phường` → lọc `don_vi_id` (giữ nguyên cũ)
 * - `Tỉnh` hoặc null → lọc `id_phong_ban` của viewer
 */
export function isCongViecAssigneeSelectable(
  scope: CongViecAssigneeScope,
  employee: { id: string; don_vi_id?: string | null; id_phong_ban?: string | null },
  opts?: CongViecAssigneeSelectableOpts,
): boolean {
  if (scope.canSelectAll) return true;
  if (isAssigneeException(employee.id, opts)) return true;
  if (scope.chucVuCapQuanLy === 'Xã phường') {
    return sameDonViId(employee.don_vi_id, scope.viewerDonViId);
  }
  return sameId(employee.id_phong_ban, scope.viewerPhongBanId);
}

/**
 * Phạm vi chọn `id_trach_nhiem` / `ids_ho_tro` trong form Công việc.
 * bypass (cap_bac=1 / quan_tri) ⇒ mọi NV hoạt động;
 * Xã phường ⇒ cùng `don_vi_id`; Tỉnh / null ⇒ cùng `id_phong_ban`.
 */
export function useCongViecAssigneeScope(): CongViecAssigneeScope {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId = APP_RESOURCE_TO_MODULE.tasks ?? 'quan-ly-giao-viec/cong-viec';
    const allowed = grantsByModule[moduleId] ?? [];
    const capQuanLy = chucVuCapQuanLy ?? null;
    const canSelectAll =
      user?.role === 'admin' ||
      !matrixActive ||
      isChucVuCapBacOne(chucVuCapBac) ||
      allowed.includes('admin') ||
      allowed.includes('all');

    const dv = user?.don_vi_id?.toString().trim();
    const pb = user?.id_phong_ban?.toString().trim();
    return {
      canSelectAll,
      chucVuCapQuanLy: capQuanLy,
      viewerDonViId: dv ? dv : null,
      viewerPhongBanId: pb ? pb : null,
    };
  }, [
    user?.role,
    user?.don_vi_id,
    user?.id_phong_ban,
    matrixActive,
    grantsByModule,
    chucVuCapBac,
    chucVuCapQuanLy,
  ]);
}

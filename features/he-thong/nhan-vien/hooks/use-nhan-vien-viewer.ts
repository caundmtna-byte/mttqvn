import { useMemo } from 'react';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';

/**
 * Phạm vi DÒNG của module Nhân viên.
 *
 * `useCan('view','employees')` chỉ trả lời "được mở trang không"; trước đây ai mở
 * được trang là thấy toàn bộ hồ sơ nhân sự của mọi đơn vị. Quy tắc mới, cùng khuôn
 * với `useCongViecAssigneeScope` (chọn người trong Công việc):
 *
 * - **Bypass** (`viewAll`): admin, chế độ legacy (`!matrixActive`), `cap_bac === 1`,
 *   grant `admin`/`all` trên module `employees`, hoặc `cap_quan_ly === 'Tỉnh'`.
 * - **Xã phường** → chỉ nhân viên cùng `don_vi_id`.
 * - **Còn lại** (`cap_quan_ly` null) → chỉ nhân viên cùng `id_phong_ban`.
 * - Hồ sơ của **chính mình** thì luôn thấy, kể cả khi hai luật trên không khớp.
 *
 * Đây là lớp lọc phía client; RLS của `var_nhan_vien` vẫn mở cho đọc (xem CLAUDE.md).
 */
export interface NhanVienViewer {
  viewAll: boolean;
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.don_vi_id` của người đang xem. */
  viewerDonViId: string | null;
  /** `var_nhan_vien.id_phong_ban` của người đang xem. */
  viewerPhongBanId: string | null;
  /** `var_nhan_vien.id` của người đang xem — luôn thấy hồ sơ của mình. */
  viewerNhanVienId: string | null;
}

/** Dòng tối thiểu cần có để xét phạm vi — nhận cả `Employee` lẫn bản ghi rút gọn. */
export interface NhanVienScopeRow {
  id: string;
  don_vi_id?: string | null;
  id_phong_ban?: string | null;
}

function sameId(a: string | null | undefined, b: string | null | undefined): boolean {
  const sa = a?.toString().trim();
  const sb = b?.toString().trim();
  return Boolean(sa) && Boolean(sb) && sa === sb;
}

function grantsHaveAdminOrAll(allowed: readonly string[]): boolean {
  return allowed.includes('admin') || allowed.includes('all');
}

/** Hàm thuần — dùng cho cả danh sách, chi tiết và dữ liệu xuất file. */
export function nhanVienRowVisible(viewer: NhanVienViewer, row: NhanVienScopeRow): boolean {
  if (viewer.viewAll) return true;
  if (viewer.viewerNhanVienId && String(row.id).trim() === viewer.viewerNhanVienId) return true;
  if (viewer.chucVuCapQuanLy === 'Xã phường') {
    return sameId(row.don_vi_id, viewer.viewerDonViId);
  }
  return sameId(row.id_phong_ban, viewer.viewerPhongBanId);
}

export function useNhanVienViewer(): NhanVienViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId = APP_RESOURCE_TO_MODULE.employees;
    const allowed = moduleId ? (grantsByModule[moduleId] ?? []) : [];
    const cap = chucVuCapQuanLy ?? null;

    const viewAll =
      user?.role === 'admin' ||
      !matrixActive ||
      isChucVuCapBacOne(chucVuCapBac) ||
      grantsHaveAdminOrAll(allowed) ||
      cap === 'Tỉnh';

    const dv = user?.don_vi_id?.toString().trim();
    const pb = user?.id_phong_ban?.toString().trim();
    const nv = user?.nhan_vien_id?.toString().trim();
    return {
      viewAll,
      chucVuCapQuanLy: cap,
      viewerDonViId: dv ? dv : null,
      viewerPhongBanId: pb ? pb : null,
      viewerNhanVienId: nv ? nv : null,
    };
  }, [
    user?.role,
    user?.don_vi_id,
    user?.id_phong_ban,
    user?.nhan_vien_id,
    matrixActive,
    grantsByModule,
    chucVuCapBac,
    chucVuCapQuanLy,
  ]);
}

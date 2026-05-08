import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';

export interface MttqUyVienUyBanViewer {
  /** True ⇒ bypass gating: cap_bac ∈ {1,2}, quan_tri (admin/all), role=admin, hoặc legacy mode chưa hydrate matrix. */
  canViewAll: boolean;
  /** `var_nhan_vien.id_phong_ban` của user hiện tại (string-safe) hoặc null. */
  viewerPhongBanId: string | null;
}

/**
 * Tổng hợp viewer cho module Ủy viên ủy ban.
 *
 * Quy tắc `canViewAll`:
 * - `user.role === 'admin'`: mock admin xem hết.
 * - `!matrixActive`: chế độ legacy / chưa hydrate matrix — giữ trải nghiệm cũ, không vô tình ẩn data.
 * - `chucVuCapBac ∈ {1, 2}`: cấp lãnh đạo bypass.
 * - Token `admin` / `all` (map từ `quan_tri`) trong grants của module danh sách ủy viên.
 *
 * Còn lại (cap_bac >= 3 hoặc null): chỉ thấy bản ghi do người cùng phòng ban tạo.
 */
export function useMttqUyVienUyBanViewer(): MttqUyVienUyBanViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);

  return useMemo(() => {
    const moduleId =
      APP_RESOURCE_TO_MODULE.matTranCommitteeMembers ??
      'mat-tran-to-quoc/uy-vien-uy-ban/danh-sach-uy-vien';
    const allowed = grantsByModule[moduleId] ?? [];
    const canViewAll =
      user?.role === 'admin' ||
      !matrixActive ||
      (chucVuCapBac != null && chucVuCapBac >= 1 && chucVuCapBac <= 2) ||
      allowed.includes('admin') ||
      allowed.includes('all');
    const phongBan = user?.id_phong_ban?.toString().trim();
    return {
      canViewAll,
      viewerPhongBanId: phongBan ? phongBan : null,
    };
  }, [user?.role, user?.id_phong_ban, matrixActive, grantsByModule, chucVuCapBac]);
}

/** Helper rút gọn dùng cho cả danh sách và detail. */
export function canViewUyVienUyBanRow(
  viewer: MttqUyVienUyBanViewer,
  row: { id_phong_ban_nguoi_tao?: string | null },
): boolean {
  if (viewer.canViewAll) return true;
  if (!viewer.viewerPhongBanId) return false;
  const rowPb = row.id_phong_ban_nguoi_tao?.toString().trim();
  return Boolean(rowPb) && rowPb === viewer.viewerPhongBanId;
}

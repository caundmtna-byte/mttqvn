import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';

export interface MttqUyVienUyBanViewer {
  /** True ⇒ bypass gating: `cap_bac === 1`, quan_tri (`admin`/`all`), `role=admin`, hoặc legacy khi chưa hydrate matrix. */
  canViewAll: boolean;
  /** `var_chuc_vu.cap_quan_ly` sau hydrate — Tỉnh / Xã phường / null. */
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.id` user hiện tại (string) — so khớp `id_nguoi_tao`. */
  viewerNhanVienId: string | null;
  /** `var_nhan_vien.don_vi_id` — so khớp `mttq_uy_vien_uy_ban.don_vi_id` khi cấp Xã. */
  viewerDonViId: string | null;
}

/**
 * Tổng hợp viewer cho module Ủy viên ủy ban.
 *
 * `canViewAll`:
 * - `user.role === 'admin'`
 * - `!matrixActive` (legacy, không ẩn dữ liệu khi chưa hydrate)
 * - `var_chuc_vu.cap_bac === 1`
 * - Grant `admin` / `all` (map từ `quan_tri`) trên module danh sách ủy viên
 *
 * Không bypass: theo `cap_quan_ly` chức vụ — Tỉnh xem hết; Xã phường (có `don_vi_id` NV) xem dòng cùng `don_vi_id`;
 * Xã phường mà NV không có `don_vi_id` → không xem dòng nào; còn lại chỉ dòng do mình tạo (`id_nguoi_tao`).
 */
export function useMttqUyVienUyBanViewer(): MttqUyVienUyBanViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId =
      APP_RESOURCE_TO_MODULE.matTranCommitteeMembers ??
      'mat-tran-to-quoc/uy-vien-uy-ban/danh-sach-uy-vien';
    const allowed = grantsByModule[moduleId] ?? [];
    const canViewAll =
      user?.role === 'admin' ||
      !matrixActive ||
      isChucVuCapBacOne(chucVuCapBac) ||
      allowed.includes('admin') ||
      allowed.includes('all');
    const nv = user?.nhan_vien_id?.toString().trim();
    const dv = user?.don_vi_id?.toString().trim();
    return {
      canViewAll,
      chucVuCapQuanLy: chucVuCapQuanLy ?? null,
      viewerNhanVienId: nv ? nv : null,
      viewerDonViId: dv ? dv : null,
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

export type UyVienUyBanRowForViewGate = {
  don_vi_id?: string | null;
  id_nguoi_tao?: string | null;
};

/** Helper rút gọn dùng cho cả danh sách và detail (thuần hàm — dễ unit test). */
export function canViewUyVienUyBanRow(viewer: MttqUyVienUyBanViewer, row: UyVienUyBanRowForViewGate): boolean {
  if (viewer.canViewAll) return true;
  if (viewer.chucVuCapQuanLy === 'Tỉnh') return true;
  if (viewer.chucVuCapQuanLy === 'Xã phường') {
    if (!viewer.viewerDonViId) return false;
    const rowDv = row.don_vi_id?.toString().trim();
    return Boolean(rowDv) && rowDv === viewer.viewerDonViId;
  }
  const creator = row.id_nguoi_tao?.toString().trim();
  return Boolean(viewer.viewerNhanVienId) && Boolean(creator) && creator === viewer.viewerNhanVienId;
}

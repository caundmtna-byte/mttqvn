import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { MttqUyVienUyBanViewer } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/hooks/use-mttq-uy-vien-uy-ban-viewer';

/**
 * Viewer cho module Báo cáo ủy viên (`matTranCommitteeMemberStats`).
 *
 * `canViewAll` đọc grant trên module báo cáo (không dùng module danh sách ủy viên).
 * Lọc từng dòng vẫn dùng `canViewUyVienUyBanRow` (cùng bảng `mttq_uy_vien_uy_ban.don_vi_id`).
 */
export function useMttqBaoCaoUyVienViewer(): MttqUyVienUyBanViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId =
      APP_RESOURCE_TO_MODULE.matTranCommitteeMemberStats ??
      'mat-tran-to-quoc/uy-vien-uy-ban/bao-cao-uy-vien';
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

/** Thuần — dùng trong unit test (grant bypass trên module báo cáo). */
export function buildBaoCaoUyVienViewerFromGrants(
  grantsByModule: Record<string, string[]>,
  opts?: {
    role?: string;
    matrixActive?: boolean;
    chucVuCapBac?: number | null;
    chucVuCapQuanLy?: MttqUyVienUyBanViewer['chucVuCapQuanLy'];
    nhanVienId?: string | null;
    donViId?: string | null;
  },
): MttqUyVienUyBanViewer {
  const moduleId =
    APP_RESOURCE_TO_MODULE.matTranCommitteeMemberStats ??
    'mat-tran-to-quoc/uy-vien-uy-ban/bao-cao-uy-vien';
  const allowed = grantsByModule[moduleId] ?? [];
  const matrixActive = opts?.matrixActive ?? true;
  const canViewAll =
    opts?.role === 'admin' ||
    !matrixActive ||
    isChucVuCapBacOne(opts?.chucVuCapBac ?? null) ||
    allowed.includes('admin') ||
    allowed.includes('all');
  const nv = opts?.nhanVienId?.toString().trim();
  const dv = opts?.donViId?.toString().trim();
  return {
    canViewAll,
    chucVuCapQuanLy: opts?.chucVuCapQuanLy ?? null,
    viewerNhanVienId: nv ? nv : null,
    viewerDonViId: dv ? dv : null,
  };
}

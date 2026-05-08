import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { BaiVietDanhSach } from '../bai-viet/core/types';

export interface ArticleAllTabViewer {
  /** True ⇒ tab "Tất cả" dùng toàn bộ bài (không lọc phòng ban). */
  canViewAllOrg: boolean;
  /** `var_nhan_vien.id_phong_ban` của user — dùng khi `canViewAllOrg` false. */
  viewerPhongBanId: string | null;
}

function grantsHaveAdminOrAll(allowed: readonly string[]): boolean {
  return allowed.includes('admin') || allowed.includes('all');
}

/**
 * Phạm vi dữ liệu tab "Tất cả" — danh sách bài viết & hoa hồng (cùng rule).
 *
 * - `role === 'admin'`, `!matrixActive`, `chucVuCapBac` ∈ {1,2}: xem hết.
 * - Token `admin` / `all` (quan_tri) trên module bài viết hoặc hoa hồng: xem hết.
 * - Còn lại: chỉ bài do NV cùng phòng ban với user.
 */
export function useArticleAllTabViewer(): ArticleAllTabViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);

  return useMemo(() => {
    const articlesMod = APP_RESOURCE_TO_MODULE.articles;
    const commissionMod = APP_RESOURCE_TO_MODULE.articleCommission;
    const articlesGrants = articlesMod ? (grantsByModule[articlesMod] ?? []) : [];
    const commissionGrants = commissionMod ? (grantsByModule[commissionMod] ?? []) : [];

    const canViewAllOrg =
      user?.role === 'admin' ||
      !matrixActive ||
      (chucVuCapBac != null && chucVuCapBac >= 1 && chucVuCapBac <= 2) ||
      grantsHaveAdminOrAll(articlesGrants) ||
      grantsHaveAdminOrAll(commissionGrants);

    const phongBan = user?.id_phong_ban?.toString().trim();
    return {
      canViewAllOrg,
      viewerPhongBanId: phongBan ? phongBan : null,
    };
  }, [user?.role, user?.id_phong_ban, matrixActive, grantsByModule, chucVuCapBac]);
}

export function rowVisibleOnArticleAllTab(viewer: ArticleAllTabViewer, row: BaiVietDanhSach): boolean {
  if (viewer.canViewAllOrg) return true;
  if (!viewer.viewerPhongBanId) return false;
  const rowPb = row.id_phong_ban_nguoi_tao?.toString().trim();
  return Boolean(rowPb) && rowPb === viewer.viewerPhongBanId;
}

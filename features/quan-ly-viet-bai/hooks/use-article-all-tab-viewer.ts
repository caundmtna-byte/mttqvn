import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';
import type { BaiVietDanhSach } from '../bai-viet/core/types';
import type { BaiVietRpcScope } from '../bai-viet/services/bai-viet-danh-sach-service';

export interface ArticleAllTabViewer {
  /** True ⇒ tab "Tất cả" xem hết (Tỉnh, quan_tri, cap_bac=1, admin, legacy). */
  viewAll: boolean;
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.don_vi_id` — lọc tab Tất cả khi cấp Xã phường. */
  viewerDonViId: string | null;
  /** `var_nhan_vien.id` — lọc bài của mình khi không có quyền xem hết. */
  viewerNhanVienId: string | null;
}

function grantsHaveAdminOrAll(allowed: readonly string[]): boolean {
  return allowed.includes('admin') || allowed.includes('all');
}

/**
 * Phạm vi tab "Tất cả" — danh sách bài viết & nhuận bút (cùng rule).
 *
 * - Bypass `viewAll`: admin, `!matrixActive`, `cap_bac === 1`, grant admin/all, **`cap_quan_ly === 'Tỉnh'`**
 * - **Xã phường:** chỉ bài có `id_don_vi_nguoi_tao` trùng `viewerDonViId`
 * - **Còn lại** (`cap_quan_ly` null): chỉ bài `id_nguoi_tao === viewerNhanVienId`
 */
export function useArticleAllTabViewer(): ArticleAllTabViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const articlesMod = APP_RESOURCE_TO_MODULE.articles;
    const commissionMod = APP_RESOURCE_TO_MODULE.articleCommission;
    const articlesGrants = articlesMod ? (grantsByModule[articlesMod] ?? []) : [];
    const commissionGrants = commissionMod ? (grantsByModule[commissionMod] ?? []) : [];
    const cap = chucVuCapQuanLy ?? null;

    const viewAll =
      user?.role === 'admin' ||
      !matrixActive ||
      isChucVuCapBacOne(chucVuCapBac) ||
      grantsHaveAdminOrAll(articlesGrants) ||
      grantsHaveAdminOrAll(commissionGrants) ||
      cap === 'Tỉnh';

    const dv = user?.don_vi_id?.toString().trim();
    const nv = user?.nhan_vien_id?.toString().trim();
    return {
      viewAll,
      chucVuCapQuanLy: cap,
      viewerDonViId: dv ? dv : null,
      viewerNhanVienId: nv ? nv : null,
    };
  }, [
    user?.role,
    user?.don_vi_id,
    user?.nhan_vien_id,
    matrixActive,
    grantsByModule,
    chucVuCapBac,
    chucVuCapQuanLy,
  ]);
}

export function rowVisibleOnArticleAllTab(viewer: ArticleAllTabViewer, row: BaiVietDanhSach): boolean {
  if (viewer.viewAll) return true;
  if (viewer.chucVuCapQuanLy === 'Xã phường') {
    if (!viewer.viewerDonViId) return false;
    const rowDv = row.id_don_vi_nguoi_tao?.toString().trim();
    return Boolean(rowDv) && rowDv === viewer.viewerDonViId;
  }
  if (!viewer.viewerNhanVienId) return false;
  return String(row.id_nguoi_tao) === viewer.viewerNhanVienId;
}

/** RPC scope cho tab "Tất cả" (server-side lọc khi Xã phường). */
export function resolveBaiVietAllTabRpcScope(viewer: ArticleAllTabViewer): BaiVietRpcScope {
  if (viewer.viewAll) return 'all';
  if (viewer.chucVuCapQuanLy === 'Xã phường' && viewer.viewerDonViId) return 'all_don_vi';
  return 'mine';
}

export function canLoadArticleAllTab(viewer: ArticleAllTabViewer): boolean {
  if (viewer.viewAll) return true;
  if (viewer.chucVuCapQuanLy === 'Xã phường') return Boolean(viewer.viewerDonViId);
  return Boolean(viewer.viewerNhanVienId);
}

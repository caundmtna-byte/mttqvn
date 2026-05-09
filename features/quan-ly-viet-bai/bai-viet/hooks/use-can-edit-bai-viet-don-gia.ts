import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';

function grantsHaveAdminOrAll(allowed: readonly string[]): boolean {
  return allowed.includes('admin') || allowed.includes('all');
}

/**
 * Chỉ cấp lãnh đạo (`cap_bac === 1`) hoặc quyền quản trị module bài viết
 * (`quan_tri` → token `admin`/`all` trong ma trận) hoặc mock admin mới chỉnh tay đơn giá.
 */
export function useCanEditBaiVietDonGia(): boolean {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);

  return useMemo(() => {
    if (user?.role === 'admin') return true;
    if (chucVuCapBac === 1) return true;
    const mod = APP_RESOURCE_TO_MODULE.articles;
    if (!mod || !matrixActive) return false;
    return grantsHaveAdminOrAll(grantsByModule[mod] ?? []);
  }, [user?.role, matrixActive, grantsByModule, chucVuCapBac]);
}

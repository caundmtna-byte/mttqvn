import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { isPermissionMatrixEnabled } from '@/lib/permission-matrix-env';
import { fetchPositionPermissionGrants } from '@/lib/fetch-position-permission-grants';
import { masterDataQueryOptions } from '@/lib/supabase/query-config';

/**
 * Sau đăng nhập / đổi user: hydrate `grantsByModule` theo chức vụ (khi `VITE_USE_PERMISSION_MATRIX=true`).
 * Dùng TanStack Query để cache kết quả 30 phút — re-mount không re-fetch.
 * Admin: không bật matrix (luật `can()` vẫn full); member: dùng phần tử đầu của `id_chuc_vu` nếu là mảng.
 */
export function useHydratePositionPermissions(): void {
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const matrixEnabled = isPermissionMatrixEnabled();

  const chucVuKey =
    user && user.role !== 'admin' && Array.isArray(user.id_chuc_vu)
      ? user.id_chuc_vu[0] ?? ''
      : '';

  const enabled =
    hasHydrated && matrixEnabled && !!user && user.role !== 'admin' && !!chucVuKey;

  const { data: grants } = useQuery({
    queryKey: ['permission-grants', chucVuKey],
    queryFn: () => fetchPositionPermissionGrants(chucVuKey),
    enabled,
    ...masterDataQueryOptions,
  });

  useEffect(() => {
    if (!enabled) {
      usePermissionGrantStore.getState().clearMatrix();
      return;
    }
    if (grants) {
      usePermissionGrantStore.getState().setMatrixGrants(grants);
    }
  }, [enabled, grants]);
}

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { isPermissionMatrixEnabled } from '@/lib/permission-matrix-env';
import { fetchPositionPermissionGrants } from '@/lib/fetch-position-permission-grants';
import { MASTER_DATA_STALE_TIME_MS, SERVER_GC_TIME_MS } from '@/lib/supabase/query-config';

/**
 * Sau đăng nhập / đổi user: hydrate `grantsByModule` theo chức vụ (khi `VITE_USE_PERMISSION_MATRIX=true`).
 * Dùng TanStack Query để cache kết quả 30 phút — re-mount không re-fetch.
 * Mọi user (kể cả admin) đều hydrate từ `var_chuc_vu` + `var_phan_quyen`; không dùng Supabase Auth role.
 */
export function useHydratePositionPermissions(): void {
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const matrixEnabled = isPermissionMatrixEnabled();

  const chucVuKey = user
    ? Array.isArray(user.id_chuc_vu)
      ? user.id_chuc_vu[0] ?? ''
      : (user.id_chuc_vu ?? '')
    : '';

  const enabled = hasHydrated && matrixEnabled && !!user && !!chucVuKey;

  // Permission matrix theo chức vụ rất ít thay đổi (admin tinh chỉnh occasional);
  // dùng `MASTER_DATA_STALE_TIME_MS` (30 phút) thay vì `staleTime: 0` để tránh
  // refetch mỗi lần remount/reconnect — đỡ egress cho mọi route protect bằng quyền.
  const { data: payload } = useQuery({
    queryKey: ['permission-grants', chucVuKey],
    queryFn: () => fetchPositionPermissionGrants(chucVuKey),
    enabled,
    staleTime: MASTER_DATA_STALE_TIME_MS,
    gcTime: SERVER_GC_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (!enabled) {
      usePermissionGrantStore.getState().clearMatrix();
      return;
    }
    if (payload) {
      usePermissionGrantStore
        .getState()
        .setMatrixGrants(payload.grantsByModule, payload.chucVuCapBac, payload.chucVuCapQuanLy);
    }
  }, [enabled, payload]);
}

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { fetchPositionPermissionGrants } from '@/lib/fetch-position-permission-grants';
import { MASTER_DATA_STALE_TIME_MS, SERVER_GC_TIME_MS } from '@/lib/supabase/query-config';

/**
 * Sau đăng nhập / đổi user: hydrate `grantsByModule` theo chức vụ từ `var_phan_quyen`.
 * Dùng TanStack Query để cache kết quả 30 phút — re-mount không re-fetch.
 */
export function useHydratePositionPermissions(): void {
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  const chucVuKey = user
    ? Array.isArray(user.id_chuc_vu)
      ? user.id_chuc_vu[0] ?? ''
      : (user.id_chuc_vu ?? '')
    : '';
  const capQuanLy = user?.cap_quan_ly ?? [];

  const enabled = hasHydrated && !!user && !!chucVuKey;

  const { data: payload } = useQuery({
    queryKey: ['permission-grants', chucVuKey, capQuanLy],
    queryFn: () => fetchPositionPermissionGrants(chucVuKey, capQuanLy),
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

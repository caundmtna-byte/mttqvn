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

  const { data: payload, isError, isPending } = useQuery({
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
    const store = usePermissionGrantStore.getState();
    if (!enabled) {
      // Chưa đăng nhập / chưa có chức vụ: không có gì để chờ, đóng cửa luôn.
      store.clearMatrix();
      return;
    }
    if (payload) {
      store.setMatrixGrants(payload.grantsByModule, payload.chucVuCapBac, payload.chucVuCapQuanLy);
      return;
    }
    if (isError) {
      // Truy vấn quyền THẤT BẠI. Trước đây nhánh này không tồn tại nên `matrixActive`
      // ở lại `false` suốt phiên và `legacyCan` cho xem mọi module. Nay thôi chờ và
      // áp deny-by-default — người dùng thấy "không có quyền" thay vì thấy hết.
      store.setMatrixLoading(false);
      return;
    }
    store.setMatrixLoading(isPending);
  }, [enabled, payload, isError, isPending]);
}

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { isPermissionMatrixEnabled } from '@/lib/permission-matrix-env';
import { fetchPositionPermissionGrants } from '@/lib/fetch-position-permission-grants';

/**
 * Sau đăng nhập / đổi user: hydrate `grantsByModule` theo chức vụ (khi `VITE_USE_PERMISSION_MATRIX=true`).
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

  useEffect(() => {
    if (!hasHydrated) return;

    if (!matrixEnabled) {
      usePermissionGrantStore.getState().clearMatrix();
      return;
    }

    if (!user) {
      usePermissionGrantStore.getState().clearMatrix();
      return;
    }

    if (user.role === 'admin') {
      usePermissionGrantStore.getState().clearMatrix();
      return;
    }

    if (!chucVuKey) {
      usePermissionGrantStore.getState().clearMatrix();
      return;
    }

    const uid = user.id;
    let cancelled = false;

    (async () => {
      try {
        const grants = await fetchPositionPermissionGrants(chucVuKey);
        if (cancelled) return;
        if (useAuthStore.getState().user?.id !== uid) return;
        usePermissionGrantStore.getState().setMatrixGrants(grants);
      } catch {
        if (cancelled) return;
        if (useAuthStore.getState().user?.id !== uid) return;
        usePermissionGrantStore.getState().clearMatrix();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, matrixEnabled, user?.id, user?.role, chucVuKey]);
}

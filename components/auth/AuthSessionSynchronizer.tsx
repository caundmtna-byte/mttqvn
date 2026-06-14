import { useEffect } from 'react';
import { useAuthStore } from '@/store/useStore';
import { getAuthService } from '@/lib/supabase/auth';

/**
 * Sau khi persist auth hydrate: làm mới `user` từ Supabase (họ tên, chức vụ, …)
 * để không phụ thuộc bản cache cũ trong localStorage/sessionStorage.
 */
export function AuthSessionSynchronizer() {
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !userId) return;

    let alive = true;
    void (async () => {
      const session = await getAuthService().getSession();
      if (!alive || !session?.user) return;
      useAuthStore.getState().login(session.user);
    })();

    return () => {
      alive = false;
    };
  }, [hasHydrated, isAuthenticated, userId]);

  return null;
}

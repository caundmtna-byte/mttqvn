import { useMemo } from 'react';
import { useAuthStore } from '@/store/useStore';
import { usePermissionSnapshot } from '@/hooks/use-permission-snapshot';
import { can, type AppAction, type AppResource } from '@/lib/permissions';

/** Gọi `can()` với subscribe matrix — tái render khi hydrate quyền chức vụ. */
export function useCan(action: AppAction, resource: AppResource): boolean {
  const user = useAuthStore((s) => s.user);
  const quyen = usePermissionSnapshot();
  return useMemo(
    () => can(user, action, resource, quyen),
    [user, action, resource, quyen]
  );
}

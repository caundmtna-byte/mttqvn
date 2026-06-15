import { useHydratePositionPermissions } from '@/hooks/use-hydrate-position-permissions';

/** Hydrate quyền theo chức vụ sau đăng nhập từ `var_phan_quyen`. */
export function PermissionMatrixSynchronizer() {
  useHydratePositionPermissions();
  return null;
}

import { useMemo } from 'react';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { PermissionSnapshot } from '@/lib/permissions';

/**
 * Subscribe phần ma trận quyền mà `can()` đọc, trả về một object ổn định (chỉ đổi khi
 * một trong ba trường đổi). Truyền nó vào `can(…, quyen)` / `isSidebarPathVisibleForUser(…, quyen)`
 * trong `useMemo` để memo tính lại đúng lúc quyền hydrate — thay vì để `can()` đọc ngầm
 * `getState()` rồi khai phụ thuộc "thừa" cho memo.
 */
export function usePermissionSnapshot(): PermissionSnapshot {
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  return useMemo(
    () => ({ matrixActive, grantsByModule, chucVuCapBac }),
    [matrixActive, grantsByModule, chucVuCapBac],
  );
}

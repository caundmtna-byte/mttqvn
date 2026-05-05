import type { User } from '@/types';
import type { ActionType } from '@/features/he-thong/phan-quyen/core/types';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';

/**
 * Hành động gắn với UI (nút, route) — mở rộng theo nghiệp vụ.
 * Khi có policy server-side, vẫn phải kiểm tra lại API.
 */
export type AppAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'import';

/**
 * Tài nguyên (module) — thêm khi có module mới.
 */
export type AppResource =
  | 'employees'
  | 'departments'
  | 'positions'
  | 'company'
  | 'permissions'
  | 'profile'
  | 'notifications'
  | '*';

/**
 * Ánh xạ `AppResource` → `module_id` trong Phân quyền (vd. `he-thong/nhan-vien`).
 * Không có trong map → `can()` dùng luật legacy (profile, notifications, *).
 */
export const APP_RESOURCE_TO_MODULE: Partial<Record<AppResource, string>> = {
  employees: 'he-thong/nhan-vien',
  departments: 'he-thong/phong-ban',
  positions: 'he-thong/chuc-vu',
  company: 'he-thong/thong-tin-to-chuc',
  permissions: 'he-thong/phan-quyen',
};

/** Module id cũ (Thông tin công ty) — vẫn tính quyền khi ma trận chưa cập nhật. */
const COMPANY_MODULE_ID_LEGACY = 'he-thong/thong-tin-cong-ty';

/** UI dùng `edit`; ma trận phân quyền dùng `update`. */
export function mapAppActionToActionType(action: AppAction): ActionType {
  if (action === 'edit') return 'update';
  return action as ActionType;
}

/**
 * Luật member (chưa hydrate matrix từ API chức vụ).
 */
function legacyCan(user: User, action: AppAction, resource: AppResource): boolean {
  void user;
  if (action === 'view') return true;
  if (resource === 'profile' && (action === 'edit' || action === 'view')) return true;
  if (resource === 'notifications' && action === 'view') return true;
  return false;
}

function grantsAllow(allowed: readonly string[], need: ReturnType<typeof mapAppActionToActionType>): boolean {
  if (allowed.includes('all') || allowed.includes('admin')) return true;
  return allowed.includes(need);
}

function matrixCan(user: User, action: AppAction, resource: AppResource): boolean {
  void user;
  const moduleId = APP_RESOURCE_TO_MODULE[resource];
  if (moduleId === undefined) {
    return legacyCan(user, action, resource);
  }
  const need = mapAppActionToActionType(action);
  const { grantsByModule } = usePermissionGrantStore.getState();

  if (resource === 'company') {
    const ids = [moduleId, COMPANY_MODULE_ID_LEGACY];
    for (const id of ids) {
      const allowed = grantsByModule[id] ?? [];
      if (grantsAllow(allowed, need)) return true;
    }
    return false;
  }

  const allowed = grantsByModule[moduleId] ?? [];
  return grantsAllow(allowed, need);
}

/**
 * Kiểm tra quyền phía client (UX: ẩn nút). Không thay thế RLS / API.
 *
 * - `admin`: toàn quyền UI (trừ xóa profile).
 * - Khi `usePermissionGrantStore.matrixActive === false`: member dùng `legacyCan`.
 * - Khi `matrixActive === true`: đối chiếu `grantsByModule` theo `module_id` + `ActionType` (sau Supabase / chức vụ).
 */
export function can(
  user: User | null | undefined,
  action: AppAction,
  resource: AppResource
): boolean {
  if (!user) return false;

  if (user.role === 'admin') {
    if (resource === 'profile' && action === 'delete') return false;
    return true;
  }

  const { matrixActive } = usePermissionGrantStore.getState();
  if (matrixActive) {
    return matrixCan(user, action, resource);
  }

  return legacyCan(user, action, resource);
}

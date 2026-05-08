import type { User } from '@/types';
import type { ActionType } from '@/features/he-thong/phan-quyen/core/types';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { isPermissionMatrixEnabled } from '@/lib/permission-matrix-env';

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
  | 'provinces'
  | 'articleSettings'
  | 'articles'
  | 'articleStats'
  | 'articleCommission'
  | 'matTranThietLapCaiDat'
  | 'matTranOfficerList'
  | 'matTranRewardList'
  | 'matTranTrainingList'
  | 'matTranTerm'
  | 'matTranSession'
  | 'matTranCommitteeMembers'
  | 'annualPrograms'
  | 'tasks'
  | 'taskReports'
  | 'otherInfoMttqNews'
  | 'otherInfoZaloOa'
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
  provinces: 'he-thong/danh-sach-tinh-thanh',
  articleSettings: 'quan-ly-viet-bai/thiet-lap-bai-viet',
  articles: 'quan-ly-viet-bai/bai-viet',
  articleStats: 'quan-ly-viet-bai/bc-thong-ke-bai-viet',
  articleCommission: 'quan-ly-viet-bai/hoa-hong-viet-bai',
  matTranThietLapCaiDat: 'mat-tran-to-quoc/thiet-lap-khac/thiet-lap-cai-dat',
  matTranOfficerList: 'mat-tran-to-quoc/thiet-lap-khac/danh-sach-can-bo',
  matTranRewardList: 'mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-khen-thuong',
  matTranTrainingList: 'mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-tap-huan',
  matTranTerm: 'mat-tran-to-quoc/uy-vien-uy-ban/nhiem-ky',
  matTranSession: 'mat-tran-to-quoc/uy-vien-uy-ban/ky-hop',
  matTranCommitteeMembers: 'mat-tran-to-quoc/uy-vien-uy-ban/danh-sach-uy-vien',
  annualPrograms: 'quan-ly-giao-viec/chuong-trinh-nam',
  tasks: 'quan-ly-giao-viec/cong-viec',
  taskReports: 'quan-ly-giao-viec/bao-cao-cong-viec',
  otherInfoMttqNews: 'trang-thong-tin-khac/tin-tuc-mttq',
  otherInfoZaloOa: 'trang-thong-tin-khac/zalo-oa',
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
  if (resource === 'profile' && (action === 'edit' || action === 'view')) return true;
  if (resource === 'notifications' && action === 'view') return true;
  if (action === 'view') return true;
  return false;
}

function grantsAllow(allowed: readonly string[], need: ReturnType<typeof mapAppActionToActionType>): boolean {
  if (allowed.includes('all') || allowed.includes('admin')) return true;
  return allowed.includes(need);
}

/** Luật OR Phòng ban: `cap_bac === 1` (chức vụ hydrate) hoặc ma trận `admin`/`all` hoặc đúng token matrix. */
function canDepartmentsWithCapBac(
  user: User,
  action: AppAction,
  grantsByModule: Record<string, ActionType[]>,
  chucVuCapBac: number | null
): boolean {
  void user;
  const moduleId = APP_RESOURCE_TO_MODULE.departments;
  if (!moduleId) return false;
  const capBypassActions: AppAction[] = ['view', 'create', 'edit', 'delete'];
  if (chucVuCapBac === 1 && capBypassActions.includes(action)) {
    return true;
  }
  const need = mapAppActionToActionType(action);
  const allowed = grantsByModule[moduleId] ?? [];
  return grantsAllow(allowed, need);
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
 * - Mock mode admin (`user.role === 'admin'`): toàn quyền UI (trừ xóa profile).
 * - Supabase mode: mọi user đều `role='user'`, quyền hoàn toàn từ `var_chuc_vu.cap_bac` + `var_phan_quyen`.
 * - Không có `id_chuc_vu` (matrix mode) → deny all.
 * - Khi `matrixActive === true`: đối chiếu `grantsByModule` theo `module_id` + `ActionType`.
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

  // Matrix mode: không có chức vụ → không có quyền gì
  if (isPermissionMatrixEnabled() && !user.id_chuc_vu) {
    return false;
  }

  const { matrixActive, grantsByModule, chucVuCapBac } = usePermissionGrantStore.getState();
  if (matrixActive) {
    // cap_bac=1: bypass toàn bộ view/create/edit/delete cho mọi module có trong APP_RESOURCE_TO_MODULE
    const capBypassActions: AppAction[] = ['view', 'create', 'edit', 'delete'];
    if (
      chucVuCapBac === 1 &&
      APP_RESOURCE_TO_MODULE[resource] !== undefined &&
      capBypassActions.includes(action)
    ) {
      return true;
    }

    if (resource === 'departments') {
      return canDepartmentsWithCapBac(user, action, grantsByModule, chucVuCapBac);
    }
    return matrixCan(user, action, resource);
  }

  return legacyCan(user, action, resource);
}

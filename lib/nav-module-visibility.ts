import type { User } from '@/types';
import { can, APP_RESOURCE_TO_MODULE, type AppResource } from '@/lib/permissions';

const HE_THONG_PREFIX = 'he-thong/';

/** Các `AppResource` thuộc nhóm Hệ thống (prefix `he-thong/` trong ma trận). */
export function getHeThongAppResources(): AppResource[] {
  return (Object.entries(APP_RESOURCE_TO_MODULE) as [AppResource, string][])
    .filter(([, mod]) => typeof mod === 'string' && mod.startsWith(HE_THONG_PREFIX))
    .map(([res]) => res);
}

/**
 * Danh sách resource dùng để quyết định **có hiện mục sidebar / thẻ Trang chủ** không (`can('view', …)`).
 * `null` = chưa áp dụng lọc theo resource (luôn hiện nếu đã qua các điều kiện khác).
 */
export function getSidebarPathGateResources(path: string): AppResource[] | null {
  if (path === '/he-thong') {
    return getHeThongAppResources();
  }
  if (path === '/mat-tran-to-quoc') {
    return [
      'matTranThietLapCaiDat',
      'matTranOfficerList',
      'matTranRewardList',
      'matTranTrainingList',
      'matTranTerm',
      'matTranSession',
      'matTranCommitteeMembers',
    ];
  }
  if (path === '/quan-ly-viet-bai') {
    return ['articleSettings', 'articles', 'articleStats', 'articleCommission'];
  }
  if (path === '/quan-ly-giao-viec') {
    return ['annualPrograms', 'tasks', 'taskReports'];
  }
  if (path === '/trang-thong-tin-khac') {
    return ['otherInfoMttqNews', 'otherInfoZaloOa'];
  }
  return null; // `/`, `/thong-tin-ban-quyen` → luôn hiện
}

/** `/` và bản quyền luôn hiện (yêu cầu nghiệp vụ). */
export function isSidebarPathAlwaysVisible(path: string): boolean {
  return path === '/' || path === '/thong-tin-ban-quyen';
}

export function isSidebarPathVisibleForUser(user: User | null | undefined, path: string): boolean {
  if (!user) return false;
  if (isSidebarPathAlwaysVisible(path)) return true;
  const gated = getSidebarPathGateResources(path);
  if (gated == null) return true;
  return gated.some((r) => can(user, 'view', r));
}

/** `navigate('/x')` với `/x` === '/' + `module_id` từ `APP_RESOURCE_TO_MODULE`. */
export function appResourceForDashboardNavigatePath(navPath: string): AppResource | null {
  const key = navPath.startsWith('/') ? navPath.slice(1) : navPath;
  const entry = (Object.entries(APP_RESOURCE_TO_MODULE) as [AppResource, string][]).find(([, mod]) => mod === key);
  return entry?.[0] ?? null;
}

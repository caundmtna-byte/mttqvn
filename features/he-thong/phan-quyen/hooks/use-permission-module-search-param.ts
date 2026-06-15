import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PERMISSION_FUNCTIONS } from '../services/phan-quyen-service';
import { getModuleStorageKey, resolveModuleIdFromStorageKey } from '../core/module-storage-key';

export const PERMISSION_MODULE_QUERY_KEY = 'module-key';

function getAllModuleIds(): string[] {
  return PERMISSION_FUNCTIONS.flatMap((fn) =>
    fn.groups.flatMap((gr) => gr.modules.map((m) => m.id)),
  );
}

const ALL_MODULE_IDS = new Set(getAllModuleIds());

export function getDefaultPermissionModuleId(): string {
  return PERMISSION_FUNCTIONS[0]?.groups?.[0]?.modules?.[0]?.id ?? 'he-thong/nhan-vien';
}

/** `module-key` query → `module_id` đầy đủ (hoặc null nếu không hợp lệ). */
export function resolvePermissionModuleIdFromQuery(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const key = raw.trim();
  const fromStorage = resolveModuleIdFromStorageKey(key);
  if (fromStorage && ALL_MODULE_IDS.has(fromStorage)) return fromStorage;
  if (ALL_MODULE_IDS.has(key)) return key;
  return null;
}

export function permissionModuleIdToQueryKey(moduleId: string): string {
  return getModuleStorageKey(moduleId);
}

/** Giữ module đang chỉnh trong URL `?module-key=` để reload không mất ngữ cảnh. */
export function usePermissionModuleSearchParam() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeModuleId = useMemo(() => {
    const resolved = resolvePermissionModuleIdFromQuery(searchParams.get(PERMISSION_MODULE_QUERY_KEY));
    return resolved ?? getDefaultPermissionModuleId();
  }, [searchParams]);

  const setActiveModuleId = useCallback(
    (moduleId: string) => {
      if (!ALL_MODULE_IDS.has(moduleId)) return;
      const next = new URLSearchParams(searchParams);
      next.set(PERMISSION_MODULE_QUERY_KEY, permissionModuleIdToQueryKey(moduleId));
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const clearActiveModuleId = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete(PERMISSION_MODULE_QUERY_KEY);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const ensureModuleKeyInUrl = useCallback(() => {
    if (searchParams.get(PERMISSION_MODULE_QUERY_KEY)) return;
    setActiveModuleId(getDefaultPermissionModuleId());
  }, [searchParams, setActiveModuleId]);

  return { activeModuleId, setActiveModuleId, clearActiveModuleId, ensureModuleKeyInUrl } as const;
}

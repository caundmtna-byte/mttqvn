import type { ActionType, ModulePermission } from '../core/types';
import { getAllPermissionModules } from '../core/permission-modules-config';
import { parseQuyenTextToActions } from '../core/var-phan-quyen-quyen-map';
import { resolveModuleIdFromStorageKey } from '../core/module-storage-key';
import { txt } from '@/lib/text';

type PqRow = { module_key: string; quyen?: string | null };

const ALL_MODULE_IDS = new Set(getAllPermissionModules().map((m) => m.id));

const INDIVIDUAL_FOR_ALL: ActionType[] = ['view', 'create', 'update', 'delete', 'admin'];

function getModuleName(moduleId: string): string {
  const m = getAllPermissionModules().find((x) => x.id === moduleId);
  return m?.nameKey ? txt(m.nameKey) : moduleId;
}

function syncAll(actions: ActionType[]): ActionType[] {
  const allOn = INDIVIDUAL_FOR_ALL.every((a) => actions.includes(a));
  if (allOn && !actions.includes('all')) return [...actions, 'all'];
  if (!allOn && actions.includes('all')) return actions.filter((a) => a !== 'all');
  return actions;
}

function resolveCanonicalModuleId(rawKey: string): string | null {
  const key = rawKey.trim();
  if (!key) return null;
  const resolved = resolveModuleIdFromStorageKey(key);
  if (resolved) return resolved;
  if (ALL_MODULE_IDS.has(key)) return key;
  return null;
}

/** Gộp nhiều dòng `var_phan_quyen` (legacy key + key ngắn) → một `ModulePermission` / module_id. */
export function mergePqRowsToModulePermissions(pqRows: PqRow[]): ModulePermission[] {
  const byModule = new Map<string, Set<ActionType>>();
  for (const r of pqRows) {
    const moduleId = resolveCanonicalModuleId(String(r.module_key));
    if (!moduleId) continue;
    const actions = parseQuyenTextToActions(r.quyen);
    if (!byModule.has(moduleId)) byModule.set(moduleId, new Set());
    const set = byModule.get(moduleId)!;
    for (const a of actions) set.add(a);
  }
  return [...byModule.entries()].map(([module_id, set]) => ({
    module_id,
    module_name: getModuleName(module_id),
    actions: [...set],
  }));
}

/** Lấy actions đã gộp cho một module (ma trận UI). */
export function getModuleActionsFromRole(
  role: { quyen_han: ModulePermission[] },
  moduleId: string,
): ActionType[] {
  const merged = new Set<ActionType>();
  for (const q of role.quyen_han) {
    if (q.module_id !== moduleId) continue;
    for (const a of q.actions) merged.add(a);
  }
  return syncAll([...merged]);
}

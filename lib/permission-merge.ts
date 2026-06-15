import type { ActionType, ModulePermission } from '@/features/he-thong/phan-quyen/core/types';

function mergeActionSets(existing: ActionType[], incoming: ActionType[]): ActionType[] {
  const set = new Set<ActionType>([...existing, ...incoming]);
  return [...set];
}

/** Gộp nhiều `ModulePermission` (ví dụ từ một chức vụ) thành `Record<module_id, actions>`. */
export function mergeModulePermissionsToGrants(modules: ModulePermission[]): Record<string, ActionType[]> {
  const out: Record<string, ActionType[]> = {};
  for (const m of modules) {
    const prev = out[m.module_id];
    out[m.module_id] = prev ? mergeActionSets(prev, m.actions) : [...m.actions];
  }
  return out;
}

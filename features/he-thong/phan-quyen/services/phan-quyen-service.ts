import { PositionPermission, ModulePermission, ActionType } from '../core/types';
import { RoleFormValues } from '../core/schema';
import { txt } from '../../../../lib/text';
import { createRepository } from '@/lib/data/create-repository';
import { ROLE_RETURNING_FULL, ROLE_SELECT_FULL } from '../core/supabase-select';
import { isSupabase } from '@/lib/data/config';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import {
  PERMISSION_FUNCTIONS,
  PERMISSION_ACTIONS,
  getAllPermissionModules,
} from '../core/permission-modules-config';

export const SYSTEM_MODULES_CONFIG = getAllPermissionModules().map((m) => ({
  id: m.id,
  nameKey: m.nameKey,
  allowedActions: [...PERMISSION_ACTIONS] as ActionType[],
}));

export function getModuleName(moduleId: string): string {
  const m = SYSTEM_MODULES_CONFIG.find((x) => x.id === moduleId);
  return m?.nameKey ?? moduleId;
}

const roleRepo = createRepository<PositionPermission>({
  tableName: 'he_thong_phan_quyen',
  select: ROLE_SELECT_FULL,
  delay: 500,
});

export const getRoles = async (): Promise<PositionPermission[]> => {
  return roleRepo.getAll();
};

/** Lấy một role theo id_chuc_vu — filter server-side trên Supabase, tránh load toàn bảng. */
export const getRoleByChucVu = async (id_chuc_vu: string): Promise<PositionPermission | null> => {
  if (isSupabase()) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client is not configured.');
    const { data, error } = await supabase
      .from('he_thong_phan_quyen')
      .select(ROLE_SELECT_FULL)
      .eq('id_chuc_vu', id_chuc_vu)
      .maybeSingle();
    if (error) handleSupabaseError(error);
    return (data as PositionPermission | null) ?? null;
  }
  const all = await roleRepo.getAll();
  return all.find((r) => r.id_chuc_vu === id_chuc_vu) ?? null;
};

export const createRole = async (
  data: RoleFormValues,
  permissions: ModulePermission[]
): Promise<PositionPermission> => {
  const id = `perm-${Date.now()}`;
  const now = new Date().toISOString();
  return roleRepo.insert(
    {
    id,
    id_chuc_vu: `pos-custom-${Date.now()}`,
    ma_chuc_vu: data.ma_vai_tro,
    ten_chuc_vu: data.ten_vai_tro,
    ten_phong_ban: txt('permission.module.undefined'),
    mo_ta: data.mo_ta || null,
    so_nhan_vien: 0,
    quyen_han: permissions,
    trang_thai: data.trang_thai,
    tg_cap_nhat: now,
  } as Omit<PositionPermission, 'id'> & { id: string },
    { returningSelect: ROLE_RETURNING_FULL },
  );
};

export const deleteRoles = async (ids: string[]): Promise<void> => {
  await roleRepo.remove(ids);
};

export const updateModulePermissions = async (
  moduleId: string,
  updates: { roleId: string; actions: ActionType[] }[]
): Promise<void> => {
  const moduleName = getModuleName(moduleId);
  for (const { roleId, actions } of updates) {
    const role = await roleRepo.getById(roleId);
    if (!role) continue;
    const otherPerms = role.quyen_han.filter((p) => p.module_id !== moduleId);
    await roleRepo.update(
      roleId,
      {
      quyen_han: [...otherPerms, { module_id: moduleId, module_name: moduleName, actions }],
      tg_cap_nhat: new Date().toISOString(),
      },
      { returningSelect: ROLE_RETURNING_FULL },
    );
  }
};

export { PERMISSION_FUNCTIONS, PERMISSION_ACTIONS, getAllPermissionModules };
export type { PermissionFunction } from '../core/permission-modules-config';

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
import { parseQuyenTextToActions, actionsToQuyenText } from '../core/var-phan-quyen-quyen-map';
import {
  getModuleStorageKey,
  resolveModuleIdFromStorageKey,
  moduleKeysForDbLookup,
} from '../core/module-storage-key';
import { normalizeCapQuanLyInput } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';

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

type VarChucVuRow = {
  id: number | string;
  ten_chuc_vu?: string | null;
  mo_ta?: string | null;
  phong_ban_id?: number | string | null;
  cap_bac?: number | null;
  cap_quan_ly?: string | null;
  trang_thai?: string | null;
  thu_tu?: number | null;
  tg_cap_nhat?: string | null;
};

type VarPhongBanRow = {
  id: number | string;
  ten_phong_ban?: string | null;
  thu_tu?: number | null;
};

type VarPhanQuyenRow = {
  module_key: string;
  chuc_vu_id: number | string;
  quyen?: string | null;
};

function parseChucVuId(raw: string): number | null {
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function mapVarChucVuToPosition(
  cv: VarChucVuRow,
  pb: VarPhongBanRow | undefined,
  pqRows: VarPhanQuyenRow[],
  soNhanVien: number,
): PositionPermission {
  const idStr = String(cv.id);
  const quyen_han: ModulePermission[] = pqRows.map((r) => {
    const rawKey = String(r.module_key);
    const moduleId = resolveModuleIdFromStorageKey(rawKey) ?? rawKey;
    return {
      module_id: moduleId,
      module_name: getModuleName(moduleId),
      actions: parseQuyenTextToActions(r.quyen),
    };
  });

  return {
    id: idStr,
    id_chuc_vu: idStr,
    ma_chuc_vu: idStr,
    ten_chuc_vu: String(cv.ten_chuc_vu ?? ''),
    ten_phong_ban: pb?.ten_phong_ban?.trim()
      ? String(pb.ten_phong_ban)
      : txt('permission.module.undefined'),
    thu_tu_phong_ban: pb?.thu_tu != null ? Number(pb.thu_tu) : undefined,
    thu_tu_chuc_vu: cv.thu_tu != null ? Number(cv.thu_tu) : undefined,
    cap_bac: cv.cap_bac != null && String(cv.cap_bac).trim() !== '' ? Number(cv.cap_bac) : null,
    cap_quan_ly: normalizeCapQuanLyInput(cv.cap_quan_ly as string | null | undefined),
    mo_ta: cv.mo_ta == null || String(cv.mo_ta) === '' ? null : String(cv.mo_ta),
    so_nhan_vien: soNhanVien,
    quyen_han,
    trang_thai: (cv.trang_thai === 'Ngừng hoạt động' ? 'Ngừng hoạt động' : 'Đang hoạt động') as PositionPermission['trang_thai'],
    tg_cap_nhat: String(cv.tg_cap_nhat ?? new Date().toISOString()),
  };
}

async function fetchRolesFromSupabase(): Promise<PositionPermission[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client is not configured.');

  const { data: chucVuList, error: cvErr } = await supabase
    .from('var_chuc_vu')
    .select('id, ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, cap_quan_ly, trang_thai, thu_tu, tg_cap_nhat')
    .order('thu_tu', { ascending: true })
    .order('id', { ascending: true });
  if (cvErr) handleSupabaseError(cvErr);

  const cvs = (chucVuList ?? []) as VarChucVuRow[];
  if (cvs.length === 0) return [];

  const chucVuIds = cvs.map((c) => Number(c.id));

  const { data: pbRows, error: pbErr } = await supabase
    .from('var_phong_ban')
    .select('id, ten_phong_ban, thu_tu');
  if (pbErr) handleSupabaseError(pbErr);

  const pbMap = new Map<number, VarPhongBanRow>();
  for (const p of (pbRows ?? []) as VarPhongBanRow[]) {
    pbMap.set(Number(p.id), p);
  }

  const { data: pqRows, error: pqErr } = await supabase
    .from('var_phan_quyen')
    .select('module_key, chuc_vu_id, quyen')
    .in('chuc_vu_id', chucVuIds);
  if (pqErr) handleSupabaseError(pqErr);

  // Egress optim: dùng RPC `get_nhan_vien_count_by_chuc_vu` (GROUP BY phía DB) thay
  // vì kéo toàn bộ `var_nhan_vien.id_chuc_vu` rồi count client. Fallback về full
  // scan nếu RPC chưa được apply (cho môi trường staging cũ).
  const empCount = new Map<number, number>();
  const { data: cntRows, error: cntErr } = await supabase.rpc('get_nhan_vien_count_by_chuc_vu');
  if (cntErr || !cntRows) {
    const { data: nvRows } = await supabase.from('var_nhan_vien').select('id_chuc_vu');
    for (const r of nvRows ?? []) {
      const raw = (r as { id_chuc_vu?: number | string | null }).id_chuc_vu;
      if (raw == null) continue;
      const n = Number(raw);
      if (!Number.isFinite(n)) continue;
      empCount.set(n, (empCount.get(n) ?? 0) + 1);
    }
  } else {
    for (const r of cntRows as { id_chuc_vu: number | string; so_nhan_vien: number | string }[]) {
      const n = Number(r.id_chuc_vu);
      const c = Number(r.so_nhan_vien);
      if (Number.isFinite(n) && Number.isFinite(c)) empCount.set(n, c);
    }
  }

  const pqByCv = new Map<number, VarPhanQuyenRow[]>();
  for (const r of (pqRows ?? []) as VarPhanQuyenRow[]) {
    const cvId = Number(r.chuc_vu_id);
    if (!pqByCv.has(cvId)) pqByCv.set(cvId, []);
    pqByCv.get(cvId)!.push(r);
  }

  return cvs.map((cv) => {
    const idNum = Number(cv.id);
    const pbId = cv.phong_ban_id != null ? Number(cv.phong_ban_id) : null;
    const pb = pbId != null && Number.isFinite(pbId) ? pbMap.get(pbId) : undefined;
    const pq = pqByCv.get(idNum) ?? [];
    return mapVarChucVuToPosition(cv, pb, pq, empCount.get(idNum) ?? 0);
  });
}

async function fetchOneRoleFromSupabase(id_chuc_vu: string): Promise<PositionPermission | null> {
  const idNum = parseChucVuId(id_chuc_vu);
  if (idNum == null) return null;

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client is not configured.');

  const { data: cv, error: cvErr } = await supabase
    .from('var_chuc_vu')
    .select('id, ten_chuc_vu, mo_ta, phong_ban_id, cap_bac, cap_quan_ly, trang_thai, thu_tu, tg_cap_nhat')
    .eq('id', idNum)
    .maybeSingle();
  if (cvErr) handleSupabaseError(cvErr);
  if (!cv) return null;

  const row = cv as VarChucVuRow;
  let pb: VarPhongBanRow | undefined;
  if (row.phong_ban_id != null) {
    const pbId = Number(row.phong_ban_id);
    if (Number.isFinite(pbId)) {
      const { data: pbRow, error: pbErr } = await supabase
        .from('var_phong_ban')
        .select('id, ten_phong_ban, thu_tu')
        .eq('id', pbId)
        .maybeSingle();
      if (pbErr) handleSupabaseError(pbErr);
      if (pbRow) pb = pbRow as VarPhongBanRow;
    }
  }

  const { data: pqRows, error: pqErr } = await supabase
    .from('var_phan_quyen')
    .select('module_key, chuc_vu_id, quyen')
    .eq('chuc_vu_id', idNum);
  if (pqErr) handleSupabaseError(pqErr);

  const { count, error: cntErr } = await supabase
    .from('var_nhan_vien')
    .select('id', { count: 'exact', head: true })
    .eq('id_chuc_vu', idNum);
  if (cntErr) handleSupabaseError(cntErr);

  return mapVarChucVuToPosition(row, pb, (pqRows ?? []) as VarPhanQuyenRow[], count ?? 0);
}

export const getRoles = async (): Promise<PositionPermission[]> => {
  if (isSupabase()) return fetchRolesFromSupabase();
  return roleRepo.getAll();
};

/** Lấy một role theo id_chuc_vu — filter server-side trên Supabase, tránh load toàn bảng. */
export const getRoleByChucVu = async (id_chuc_vu: string): Promise<PositionPermission | null> => {
  if (isSupabase()) return fetchOneRoleFromSupabase(id_chuc_vu);
  const all = await roleRepo.getAll();
  return all.find((r) => r.id_chuc_vu === id_chuc_vu) ?? null;
};

export const createRole = async (
  data: RoleFormValues,
  permissions: ModulePermission[]
): Promise<PositionPermission> => {
  if (isSupabase()) {
    throw new Error(
      'Đã kết nối Supabase: tạo chức vụ tại module Chức vụ (var_chuc_vu); gán quyền qua ma trận (var_phan_quyen).',
    );
  }
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
  if (isSupabase()) {
    throw new Error('Đã kết nối Supabase: xóa chức vụ tại module Chức vụ (var_chuc_vu).');
  }
  await roleRepo.remove(ids);
};

export const updateModulePermissions = async (
  moduleId: string,
  updates: { roleId: string; actions: ActionType[] }[]
): Promise<void> => {
  if (isSupabase()) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client is not configured.');
    if (updates.length === 0) return;

    const storageKey = getModuleStorageKey(moduleId);
    const legacyKeys = moduleKeysForDbLookup(moduleId);

    const chucVuIds = [
      ...new Set(
        updates.map(({ roleId }) => parseChucVuId(roleId)).filter((n): n is number => n != null),
      ),
    ];
    if (chucVuIds.length === 0) return;

    const { error: delErr } = await supabase
      .from('var_phan_quyen')
      .delete()
      .in('chuc_vu_id', chucVuIds)
      .in('module_key', legacyKeys);
    if (delErr) handleSupabaseError(delErr);

    const rows = updates
      .filter(({ actions }) => actions.length > 0)
      .map(({ roleId, actions }) => {
        const chucVuId = parseChucVuId(roleId);
        if (chucVuId == null) return null;
        return {
          chuc_vu_id: chucVuId,
          module_key: storageKey,
          quyen: actionsToQuyenText(actions),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r != null);

    if (rows.length > 0) {
      const { error: upErr } = await supabase.from('var_phan_quyen').upsert(rows, {
        onConflict: 'chuc_vu_id,module_key',
      });
      if (upErr) handleSupabaseError(upErr);
    }
    return;
  }

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

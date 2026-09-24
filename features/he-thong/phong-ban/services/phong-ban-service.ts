import { Department } from '../core/types';
import { DepartmentFormValues } from '../core/schema';
import { createRepository } from '@/lib/data/create-repository';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import {
  DEPARTMENT_RETURNING_FULL,
  DEPARTMENT_RETURNING_STATUS_ONLY,
  DEPARTMENT_SELECT_FULL,
} from '../core/supabase-select';
import { txt } from '../../../../lib/text';

const repo = createRepository<Department>({
  tableName: 'var_phong_ban',
  select: DEPARTMENT_SELECT_FULL,
});

/** Chuẩn hoá id / FK int8 từ PostgREST (number hoặc chuỗi số). */
function normalizeDepartmentRow(raw: Department): Department {
  return {
    ...raw,
    id: String(raw.id),
    cha_id: raw.cha_id == null || raw.cha_id === '' ? null : String(raw.cha_id),
    cap_do: typeof raw.cap_do === 'number' ? raw.cap_do : Number(raw.cap_do),
    thu_tu: typeof raw.thu_tu === 'number' ? raw.thu_tu : Number(raw.thu_tu),
  };
}

function normInt8Fk(v: string | null | undefined): number | null {
  const s = v == null || v === '' ? '' : String(v).trim();
  if (!s || !/^\d+$/.test(s)) return null;
  return Number(s);
}

function chaIdForStorage(chaId: string | null): number | null {
  if (chaId == null || chaId === '') return null;
  return normInt8Fk(chaId);
}

function resolveChaIdForm(dataCha: string | null | undefined): string | null {
  if (dataCha === '' || dataCha == null) return null;
  return String(dataCha).trim();
}

export const getDepartments = async (): Promise<Department[]> => {
  const list = await repo.getAll({ orderBy: 'duong_dan', ascending: true });
  return list.map((row) => normalizeDepartmentRow(row as Department));
};

/** Form → cột DB (không có đường dẫn cây / mốc thời gian). Dùng chung cho form và nhập file. */
export function departmentFormToPayload(data: DepartmentFormValues): Record<string, unknown> {
  return {
    ten_phong_ban: data.ten_phong_ban.trim(),
    mo_ta: data.mo_ta && data.mo_ta.trim() !== '' ? data.mo_ta.trim() : null,
    cha_id: chaIdForStorage(resolveChaIdForm(data.cha_id)),
    trang_thai: data.trang_thai,
    thu_tu: data.thu_tu ?? 0,
  };
}

export const createDepartment = async (data: DepartmentFormValues): Promise<Department> => {
  const now = new Date().toISOString();
  const inserted = await repo.insert(
    {
      ...departmentFormToPayload(data),
      duong_dan: '',
      cap_do: 0,
      tg_tao: now,
      tg_cap_nhat: now,
    } as unknown as Omit<Department, 'id'> & { id?: string },
    { returningSelect: DEPARTMENT_RETURNING_FULL },
  );
  return normalizeDepartmentRow(inserted as Department);
};

/**
 * `duong_dan` / `cap_do` khi gán cha mới — tránh `repo.getAll()`:
 * ưu tiên RPC `get_phong_ban_path_level` (1 round-trip, server-side)
 * với fallback chỉ 2 cột của phòng cha nếu RPC chưa apply.
 * Trigger DB chỉ tính đường dẫn lúc INSERT, nên UPDATE phải tự tính.
 */
async function tinhViTriCay(id: string, chaId: string | null): Promise<{ duong_dan: string; cap_do: number }> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client is not configured.');

  const idNum = normInt8Fk(id);
  const chaNum = normInt8Fk(chaId ?? undefined);

  const { data: existingRow, error: e0 } = await supabase
    .from('var_phong_ban')
    .select('id, cha_id, duong_dan, cap_do')
    .eq('id', idNum as number)
    .maybeSingle();
  if (e0) handleSupabaseError(e0);
  if (!existingRow) throw new Error(txt('department.service.notFound'));
  const existing = {
    cha_id: (existingRow as { cha_id: number | string | null }).cha_id == null
      ? null
      : String((existingRow as { cha_id: number | string }).cha_id),
    duong_dan: String((existingRow as { duong_dan: string }).duong_dan),
    cap_do: Number((existingRow as { cap_do: number | string }).cap_do),
  };

  if (chaId === existing.cha_id) return { duong_dan: existing.duong_dan, cap_do: existing.cap_do };

  const { data: rpcData, error: rpcErr } = await supabase.rpc('get_phong_ban_path_level', {
    p_id: idNum,
    p_cha_id: chaNum,
  });
  const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
  if (!rpcErr && rpcRow) {
    return {
      duong_dan: String((rpcRow as { duong_dan: string }).duong_dan),
      cap_do: Number((rpcRow as { cap_do: number | string }).cap_do),
    };
  }
  if (chaNum == null) return { duong_dan: `/${id}`, cap_do: 1 };
  const { data: parentRow } = await supabase
    .from('var_phong_ban')
    .select('duong_dan, cap_do')
    .eq('id', chaNum)
    .maybeSingle();
  if (parentRow) {
    return {
      duong_dan: `${(parentRow as { duong_dan: string }).duong_dan}/${id}`,
      cap_do: Number((parentRow as { cap_do: number | string }).cap_do) + 1,
    };
  }
  return { duong_dan: existing.duong_dan, cap_do: existing.cap_do };
}

export const updateDepartment = async (id: string, data: DepartmentFormValues): Promise<Department> => {
  const viTri = await tinhViTriCay(id, resolveChaIdForm(data.cha_id));
  const updated = await repo.update(
    id,
    {
      ...departmentFormToPayload(data),
      ...viTri,
      tg_cap_nhat: new Date().toISOString(),
    } as unknown as Partial<Department>,
    { returningSelect: DEPARTMENT_RETURNING_FULL },
  );
  return normalizeDepartmentRow(updated as Department);
};

/**
 * Ghi đè từ file: chỉ các cột có trong `payload`. Có đổi phòng cha thì tính lại
 * đường dẫn cây như form sửa.
 */
export async function updateDepartmentPartial(id: string, payload: Record<string, unknown>): Promise<void> {
  const out: Record<string, unknown> = { ...payload, tg_cap_nhat: new Date().toISOString() };
  if ('cha_id' in payload) {
    Object.assign(out, await tinhViTriCay(id, payload.cha_id == null ? null : String(payload.cha_id)));
  }
  await repo.update(id, out as unknown as Partial<Department>, { returningSelect: 'id' });
}

export const updateDepartmentStatus = async (id: string, status: TrangThaiHoatDong): Promise<Department> => {
  const updated = await repo.update(
    id,
    { trang_thai: status, tg_cap_nhat: new Date().toISOString() } as unknown as Partial<Department>,
    { returningSelect: DEPARTMENT_RETURNING_STATUS_ONLY },
  );
  return normalizeDepartmentRow(updated as Department);
};

export const deleteDepartment = async (id: string): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client is not configured.');
  const idNum = normInt8Fk(id);
  if (idNum != null) {
    const { count, error } = await supabase
      .from('var_phong_ban')
      .select('id', { count: 'exact', head: true })
      .eq('cha_id', idNum);
    if (error) handleSupabaseError(error);
    if ((count ?? 0) > 0) throw new Error(txt('department.service.hasChildren'));
  }
  await repo.remove([id]);
};

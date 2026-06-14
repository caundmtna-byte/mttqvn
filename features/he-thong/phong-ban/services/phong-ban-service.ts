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

export const createDepartment = async (data: DepartmentFormValues): Promise<Department> => {
  const now = new Date().toISOString();
  const chaId = resolveChaIdForm(data.cha_id);
  const ten = data.ten_phong_ban.trim();

  const inserted = await repo.insert(
    {
      ten_phong_ban: ten,
      mo_ta: data.mo_ta && data.mo_ta.trim() !== '' ? data.mo_ta.trim() : null,
      cha_id: normInt8Fk(chaId ?? undefined),
      trang_thai: data.trang_thai,
      thu_tu: data.thu_tu ?? 0,
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
 * Cập nhật phòng ban — tránh `repo.getAll()` để recompute `duong_dan`/`cap_do`:
 * ưu tiên RPC `get_phong_ban_path_level` (1 round-trip, server-side)
 * với fallback `.in('id', [...])` chỉ 4 cột nhẹ nếu RPC chưa apply.
 */
export const updateDepartment = async (id: string, data: DepartmentFormValues): Promise<Department> => {
  const chaId = resolveChaIdForm(data.cha_id);
  const ten = data.ten_phong_ban.trim();
  let duong_dan: string;
  let cap_do: number;

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

  if (chaId === existing.cha_id) {
    duong_dan = existing.duong_dan;
    cap_do = existing.cap_do;
  } else {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_phong_ban_path_level', {
      p_id: idNum,
      p_cha_id: chaNum,
    });
    const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (!rpcErr && rpcRow) {
      duong_dan = String((rpcRow as { duong_dan: string }).duong_dan);
      cap_do = Number((rpcRow as { cap_do: number | string }).cap_do);
    } else if (chaNum == null) {
      duong_dan = `/${id}`;
      cap_do = 1;
    } else {
      const { data: parentRow } = await supabase
        .from('var_phong_ban')
        .select('duong_dan, cap_do')
        .eq('id', chaNum)
        .maybeSingle();
      if (parentRow) {
        duong_dan = `${(parentRow as { duong_dan: string }).duong_dan}/${id}`;
        cap_do = Number((parentRow as { cap_do: number | string }).cap_do) + 1;
      } else {
        duong_dan = existing.duong_dan;
        cap_do = existing.cap_do;
      }
    }
  }

  const updated = await repo.update(
    id,
    {
      ten_phong_ban: ten,
      mo_ta: data.mo_ta && data.mo_ta.trim() !== '' ? data.mo_ta.trim() : null,
      cha_id: chaIdForStorage(chaId),
      trang_thai: data.trang_thai,
      thu_tu: data.thu_tu ?? 0,
      duong_dan,
      cap_do,
      tg_cap_nhat: new Date().toISOString(),
    } as unknown as Partial<Department>,
    { returningSelect: DEPARTMENT_RETURNING_FULL },
  );
  return normalizeDepartmentRow(updated as Department);
};

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

/** Import nhiều phòng ban (chỉ thêm mới, cha_id = null hoặc id có sẵn) */
export const importDepartments = async (
  rows: DepartmentFormValues[],
): Promise<{ created: number; errors: string[] }> => {
  const errors: string[] = [];
  let created = 0;
  const all = await getDepartments(); // fetch 1 lần cho toàn bộ import
  for (let i = 0; i < rows.length; i++) {
    try {
      const data = rows[i];
      const idCha = resolveChaIdForm(data.cha_id);
      if (idCha && !all.some((d) => d.id === idCha)) {
        errors.push(`Dòng ${i + 2}: Phòng cha không tồn tại`);
        continue;
      }
      await createDepartment({ ...data, cha_id: idCha ?? undefined });
      created++;
    } catch (e: unknown) {
      errors.push(`Dòng ${i + 2}: ${e instanceof Error ? e.message : 'Lỗi'}`);
    }
  }
  return { created, errors };
};

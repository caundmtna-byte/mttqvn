import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { LuongThietLapNgachDetail, LuongThietLapNgachListRow } from '../core/types';
import type { LuongThietLapNgachFormValues } from '../core/schema';
import { LUONG_THIET_LAP_NGACH_RETURNING, LUONG_THIET_LAP_NGACH_SELECT } from '../core/supabase-select';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'luong_thiet_lap_ngach_luong',
  select: LUONG_THIET_LAP_NGACH_SELECT,
});

function nullableStr(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

export function flattenLuongThietLapNgachRow(row: Record<string, unknown>): LuongThietLapNgachListRow {
  const r = row;
  return {
    id: String(r.id ?? ''),
    ma: nullableStr(r.ma),
    ten: String(r.ten ?? ''),
    mo_ta: nullableStr(r.mo_ta),
    thu_tu: Number(r.thu_tu ?? 0),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
  };
}

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t === '' ? null : t;
}

function formToPayload(data: LuongThietLapNgachFormValues): Record<string, unknown> {
  return {
    ma: emptyToNull((data.ma ?? '').trim()),
    ten: data.ten.trim(),
    mo_ta: emptyToNull((data.mo_ta ?? '').trim()),
    thu_tu: data.thu_tu,
  };
}

export async function getLuongThietLapNgachList(): Promise<LuongThietLapNgachListRow[]> {
  const list = await repo.getAll({ orderBy: 'thu_tu', ascending: true });
  return list.map((row) => flattenLuongThietLapNgachRow(row as unknown as Record<string, unknown>));
}

export async function getLuongThietLapNgachById(id: string): Promise<LuongThietLapNgachDetail | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('luong_thiet_lap_ngach_luong')
    .select(LUONG_THIET_LAP_NGACH_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenLuongThietLapNgachRow(data as unknown as Record<string, unknown>);
}

export async function createLuongThietLapNgach(data: LuongThietLapNgachFormValues): Promise<LuongThietLapNgachListRow> {
  const payload = formToPayload(data);
  const inserted = await repo.insert(payload as unknown as Omit<RepoRow, 'id'>, {
    returningSelect: LUONG_THIET_LAP_NGACH_RETURNING,
  });
  return flattenLuongThietLapNgachRow(inserted as unknown as Record<string, unknown>);
}

export async function updateLuongThietLapNgach(
  id: string,
  data: LuongThietLapNgachFormValues,
): Promise<LuongThietLapNgachListRow> {
  const payload = formToPayload(data);
  const updated = await repo.update(id, payload as unknown as Partial<RepoRow>, {
    returningSelect: LUONG_THIET_LAP_NGACH_RETURNING,
  });
  return flattenLuongThietLapNgachRow(updated as unknown as Record<string, unknown>);
}

export async function deleteLuongThietLapNgachMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await repo.remove(ids);
}

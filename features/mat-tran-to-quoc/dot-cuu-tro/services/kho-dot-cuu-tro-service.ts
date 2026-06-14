import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { KhoDotCuuTroDetail, KhoDotCuuTroListRow } from '../core/types';
import type { KhoDotCuuTroFormValues } from '../core/schema';
import {
  KHO_DOT_CUU_TRO_RETURNING_LIST,
  KHO_DOT_CUU_TRO_SELECT_FULL,
  KHO_DOT_CUU_TRO_SELECT_LIST,
} from '../core/supabase-select';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'kho_dot_cuu_tro',
  select: KHO_DOT_CUU_TRO_SELECT_LIST,
});

function nullableStr(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

export function flattenKhoDotCuuTroListRow(row: Record<string, unknown>): KhoDotCuuTroListRow {
  const r = row as Record<string, unknown>;
  return {
    id: String(r.id ?? ''),
    tt: Number(r.tt ?? 0),
    ten: String(r.ten ?? ''),
    link: nullableStr(r.link),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
  };
}

export function flattenKhoDotCuuTroDetail(row: Record<string, unknown>): KhoDotCuuTroDetail {
  const base = flattenKhoDotCuuTroListRow(row);
  const r = row as Record<string, unknown>;
  return {
    ...base,
    mo_ta: nullableStr(r.mo_ta),
  };
}

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t === '' ? null : t;
}

function formToPayload(data: KhoDotCuuTroFormValues): Record<string, unknown> {
  return {
    ten: data.ten.trim(),
    mo_ta: emptyToNull(data.mo_ta),
    link: emptyToNull(data.link),
  };
}

export async function getKhoDotCuuTroList(): Promise<KhoDotCuuTroListRow[]> {
  const list = await repo.getAll({ orderBy: 'tt', ascending: true });
  return list.map((row) => flattenKhoDotCuuTroListRow(row as unknown as Record<string, unknown>));
}

export async function getKhoDotCuuTroById(id: string): Promise<KhoDotCuuTroDetail | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('kho_dot_cuu_tro')
    .select(KHO_DOT_CUU_TRO_SELECT_FULL)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenKhoDotCuuTroDetail(data as unknown as Record<string, unknown>);
}

export async function createKhoDotCuuTro(data: KhoDotCuuTroFormValues): Promise<KhoDotCuuTroListRow> {
  const payload = formToPayload(data);
  const inserted = await repo.insert(payload as unknown as Omit<RepoRow, 'id'>, {
    returningSelect: KHO_DOT_CUU_TRO_RETURNING_LIST,
  });
  return flattenKhoDotCuuTroListRow(inserted as unknown as Record<string, unknown>);
}

export async function updateKhoDotCuuTro(id: string, data: KhoDotCuuTroFormValues): Promise<KhoDotCuuTroListRow> {
  const payload = formToPayload(data);
  const updated = await repo.update(id, payload as unknown as Partial<RepoRow>, {
    returningSelect: KHO_DOT_CUU_TRO_RETURNING_LIST,
  });
  return flattenKhoDotCuuTroListRow(updated as unknown as Record<string, unknown>);
}

export async function deleteKhoDotCuuTroMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await repo.remove(ids);
}

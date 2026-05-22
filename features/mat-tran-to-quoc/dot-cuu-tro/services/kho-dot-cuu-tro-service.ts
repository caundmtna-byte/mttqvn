import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
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
import { KHO_DOT_CUU_TRO_MOCK } from '../mock-data';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'kho_dot_cuu_tro',
  select: KHO_DOT_CUU_TRO_SELECT_LIST,
  delay: 350,
  mockData: [],
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

let mockRowsList: KhoDotCuuTroListRow[] = structuredClone(KHO_DOT_CUU_TRO_MOCK);
/** Mock detail: mo_ta lưu ngoài list shape */
const mockMoTaById: Record<string, string | null> = {
  '1': 'Đợt cứu trợ sau bão (dữ liệu mock).',
};

function mockNextId(): string {
  const maxId = Math.max(0, ...mockRowsList.map((r) => Number(r.id) || 0));
  return String(maxId + 1);
}

function mockNextTt(): number {
  const maxTt = Math.max(0, ...mockRowsList.map((r) => r.tt));
  return maxTt + 1;
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
  if (!isSupabase()) {
    return [...mockRowsList].sort((a, b) => {
      if (a.tt !== b.tt) return a.tt - b.tt;
      return b.tg_cap_nhat.localeCompare(a.tg_cap_nhat);
    });
  }
  const list = await repo.getAll({ orderBy: 'tt', ascending: true });
  return list.map((row) => flattenKhoDotCuuTroListRow(row as unknown as Record<string, unknown>));
}

export async function getKhoDotCuuTroById(id: string): Promise<KhoDotCuuTroDetail | null> {
  if (!isSupabase()) {
    const row = mockRowsList.find((r) => r.id === id);
    if (!row) return null;
    return { ...row, mo_ta: mockMoTaById[id] ?? null };
  }
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
  if (!isSupabase()) {
    const now = new Date().toISOString();
    const id = mockNextId();
    const row: KhoDotCuuTroListRow = {
      id,
      tt: mockNextTt(),
      ten: String(payload.ten),
      link: nullableStr(payload.link),
      tg_tao: now,
      tg_cap_nhat: now,
    };
    mockMoTaById[id] = nullableStr(payload.mo_ta);
    mockRowsList = [row, ...mockRowsList];
    return row;
  }
  const inserted = await repo.insert(payload as unknown as Omit<RepoRow, 'id'>, {
    returningSelect: KHO_DOT_CUU_TRO_RETURNING_LIST,
  });
  return flattenKhoDotCuuTroListRow(inserted as unknown as Record<string, unknown>);
}

export async function updateKhoDotCuuTro(id: string, data: KhoDotCuuTroFormValues): Promise<KhoDotCuuTroListRow> {
  const payload = formToPayload(data);
  if (!isSupabase()) {
    const idx = mockRowsList.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(txt('matTranDotCuuTro.service.notFound'));
    const prev = mockRowsList[idx];
    const now = new Date().toISOString();
    const row: KhoDotCuuTroListRow = {
      ...prev,
      ten: String(payload.ten),
      link: nullableStr(payload.link),
      tg_cap_nhat: now,
    };
    mockMoTaById[id] = nullableStr(payload.mo_ta);
    mockRowsList = [...mockRowsList.slice(0, idx), row, ...mockRowsList.slice(idx + 1)];
    return row;
  }
  const updated = await repo.update(id, payload as unknown as Partial<RepoRow>, {
    returningSelect: KHO_DOT_CUU_TRO_RETURNING_LIST,
  });
  return flattenKhoDotCuuTroListRow(updated as unknown as Record<string, unknown>);
}

export async function deleteKhoDotCuuTroMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  if (!isSupabase()) {
    const set = new Set(ids);
    mockRowsList = mockRowsList.filter((r) => !set.has(r.id));
    for (const id of ids) delete mockMoTaById[id];
    return;
  }
  await repo.remove(ids);
}

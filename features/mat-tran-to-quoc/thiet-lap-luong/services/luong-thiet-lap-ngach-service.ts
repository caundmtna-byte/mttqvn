import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { LuongThietLapNgachDetail, LuongThietLapNgachListRow } from '../core/types';
import type { LuongThietLapNgachFormValues } from '../core/schema';
import { LUONG_THIET_LAP_NGACH_RETURNING, LUONG_THIET_LAP_NGACH_SELECT } from '../core/supabase-select';
import { deleteLuongThietLapNgachMockBac } from './luong-thiet-lap-bac-service';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'luong_thiet_lap_ngach_luong',
  select: LUONG_THIET_LAP_NGACH_SELECT,
  delay: 300,
  mockData: [],
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

let mockRows: LuongThietLapNgachListRow[] = [];

function mockNextId(): string {
  const maxId = Math.max(0, ...mockRows.map((r) => Number(r.id) || 0));
  return String(maxId + 1);
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
  if (!isSupabase()) {
    return [...mockRows].sort((a, b) => {
      if (a.thu_tu !== b.thu_tu) return a.thu_tu - b.thu_tu;
      return b.tg_cap_nhat.localeCompare(a.tg_cap_nhat);
    });
  }
  const list = await repo.getAll({ orderBy: 'thu_tu', ascending: true });
  return list.map((row) => flattenLuongThietLapNgachRow(row as unknown as Record<string, unknown>));
}

export async function getLuongThietLapNgachById(id: string): Promise<LuongThietLapNgachDetail | null> {
  if (!isSupabase()) {
    return mockRows.find((r) => r.id === id) ?? null;
  }
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
  if (!isSupabase()) {
    const now = new Date().toISOString();
    const row: LuongThietLapNgachListRow = {
      id: mockNextId(),
      ma: nullableStr(payload.ma),
      ten: String(payload.ten),
      mo_ta: nullableStr(payload.mo_ta),
      thu_tu: Number(payload.thu_tu ?? 0),
      tg_tao: now,
      tg_cap_nhat: now,
    };
    mockRows = [row, ...mockRows];
    return row;
  }
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
  if (!isSupabase()) {
    const idx = mockRows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(txt('matTranThietLapLuong.service.notFound'));
    const prev = mockRows[idx];
    const now = new Date().toISOString();
    const row: LuongThietLapNgachListRow = {
      ...prev,
      ma: nullableStr(payload.ma),
      ten: String(payload.ten),
      mo_ta: nullableStr(payload.mo_ta),
      thu_tu: Number(payload.thu_tu ?? 0),
      tg_cap_nhat: now,
    };
    mockRows = [...mockRows.slice(0, idx), row, ...mockRows.slice(idx + 1)];
    return row;
  }
  const updated = await repo.update(id, payload as unknown as Partial<RepoRow>, {
    returningSelect: LUONG_THIET_LAP_NGACH_RETURNING,
  });
  return flattenLuongThietLapNgachRow(updated as unknown as Record<string, unknown>);
}

export async function deleteLuongThietLapNgachMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  if (!isSupabase()) {
    const set = new Set(ids);
    for (const id of ids) {
      deleteLuongThietLapNgachMockBac(id);
    }
    mockRows = mockRows.filter((r) => !set.has(r.id));
    return;
  }
  await repo.remove(ids);
}

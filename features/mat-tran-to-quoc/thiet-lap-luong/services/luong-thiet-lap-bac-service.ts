import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { LuongThietLapBacRow } from '../core/types';
import { LUONG_THIET_LAP_BAC_MA_CODES, type LuongThietLapBacMaCode } from '../core/schema';
import { LUONG_THIET_LAP_BAC_RETURNING, LUONG_THIET_LAP_BAC_SELECT } from '../core/supabase-select';

function flattenBac(row: Record<string, unknown>): LuongThietLapBacRow {
  return {
    id: String(row.id ?? ''),
    ngach_id: String(row.ngach_id ?? ''),
    ma_bac: String(row.ma_bac ?? ''),
    he_so: String(row.he_so ?? ''),
    thu_tu: Number(row.thu_tu ?? 0),
    tg_tao: String(row.tg_tao ?? ''),
    tg_cap_nhat: String(row.tg_cap_nhat ?? ''),
  };
}

const mockBacByNgach: Record<string, LuongThietLapBacRow[]> = {};

/** Xóa cache mock bậc khi xóa ngạch (tránh circular import từ ngach-service). */
export function deleteLuongThietLapNgachMockBac(ngachId: string): void {
  delete mockBacByNgach[ngachId];
}

/** Lần đầu tải mock: seed đủ B1–B9. Nếu đã có key (kể cả mảng rỗng sau CRUD) thì không ghi đè. */
function seedMockBacIfUnset(ngachId: string): LuongThietLapBacRow[] {
  if (Object.prototype.hasOwnProperty.call(mockBacByNgach, ngachId)) {
    return mockBacByNgach[ngachId];
  }
  const now = new Date().toISOString();
  const rows: LuongThietLapBacRow[] = [];
  for (let i = 1; i <= 9; i += 1) {
    rows.push({
      id: `${ngachId}-b${i}`,
      ngach_id: ngachId,
      ma_bac: `B${i}`,
      he_so: '1.0000',
      thu_tu: i,
      tg_tao: now,
      tg_cap_nhat: now,
    });
  }
  mockBacByNgach[ngachId] = rows;
  return rows;
}

/** Các mã B1–B9 chưa có trong danh sách ngạch hiện tại (để thêm bậc). */
export function listMissingMaBacForNgach(rows: LuongThietLapBacRow[]): LuongThietLapBacMaCode[] {
  const used = new Set(rows.map((r) => r.ma_bac));
  return LUONG_THIET_LAP_BAC_MA_CODES.filter((c) => !used.has(c));
}

function sortBacRows(rows: LuongThietLapBacRow[]): LuongThietLapBacRow[] {
  return [...rows].sort((a, b) =>
    a.ngach_id !== b.ngach_id
      ? a.ngach_id.localeCompare(b.ngach_id)
      : a.thu_tu !== b.thu_tu
        ? a.thu_tu - b.thu_tu
        : a.ma_bac.localeCompare(b.ma_bac),
  );
}

export async function getLuongThietLapBacByNgach(ngachId: string): Promise<LuongThietLapBacRow[]> {
  if (!ngachId.trim()) return [];
  if (!isSupabase()) {
    return [...seedMockBacIfUnset(ngachId)].sort((a, b) => a.thu_tu - b.thu_tu);
  }
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('luong_thiet_lap_bac_luong')
    .select(LUONG_THIET_LAP_BAC_SELECT)
    .eq('ngach_id', ngachId)
    .order('thu_tu', { ascending: true });
  if (error) handleSupabaseError(error);
  return (data ?? []).map((r) => flattenBac(r as unknown as Record<string, unknown>));
}

/** Toàn bộ bậc (mock: seed theo danh sách ngạch đã biết). */
export async function getLuongThietLapBacAll(ngachIds: string[] = []): Promise<LuongThietLapBacRow[]> {
  if (!isSupabase()) {
    const ids = ngachIds.length > 0 ? ngachIds : Object.keys(mockBacByNgach);
    return sortBacRows(ids.flatMap((id) => seedMockBacIfUnset(id)));
  }
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('luong_thiet_lap_bac_luong')
    .select(LUONG_THIET_LAP_BAC_SELECT)
    .order('ngach_id', { ascending: true })
    .order('thu_tu', { ascending: true });
  if (error) handleSupabaseError(error);
  return sortBacRows((data ?? []).map((r) => flattenBac(r as unknown as Record<string, unknown>)));
}

export interface CreateLuongThietLapBacInput {
  ngach_id: string;
  ma_bac: LuongThietLapBacMaCode;
  he_so: number;
  thu_tu: number;
}

export async function createLuongThietLapBac(input: CreateLuongThietLapBacInput): Promise<LuongThietLapBacRow> {
  const ngachId = input.ngach_id.trim();
  if (!ngachId) throw new Error(txt('matTranThietLapLuong.service.notFound'));
  if (!Number.isFinite(input.he_so) || input.he_so <= 0) {
    throw new Error(txt('matTranThietLapLuong.validation.heSoInvalid'));
  }
  if (!LUONG_THIET_LAP_BAC_MA_CODES.includes(input.ma_bac)) {
    throw new Error(txt('matTranThietLapLuong.validation.bacMaInvalid'));
  }
  if (!isSupabase()) {
    if (!Object.prototype.hasOwnProperty.call(mockBacByNgach, ngachId)) {
      mockBacByNgach[ngachId] = [];
    }
    const rows = mockBacByNgach[ngachId];
    if (rows.some((r) => r.ma_bac === input.ma_bac)) {
      throw new Error(txt('matTranThietLapLuong.validation.bacMaDuplicate'));
    }
    const now = new Date().toISOString();
    const row: LuongThietLapBacRow = {
      id: `mock-bac-${ngachId}-${input.ma_bac}-${Date.now()}`,
      ngach_id: ngachId,
      ma_bac: input.ma_bac,
      he_so: String(input.he_so),
      thu_tu: input.thu_tu,
      tg_tao: now,
      tg_cap_nhat: now,
    };
    rows.push(row);
    mockBacByNgach[ngachId] = [...rows].sort((a, b) => a.thu_tu - b.thu_tu);
    return row;
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error(txt('matTranThietLapLuong.service.notFound'));
  const { data, error } = await supabase
    .from('luong_thiet_lap_bac_luong')
    .insert({
      ngach_id: ngachId,
      ma_bac: input.ma_bac,
      he_so: input.he_so,
      thu_tu: input.thu_tu,
    })
    .select(LUONG_THIET_LAP_BAC_RETURNING)
    .single();
  if (error) handleSupabaseError(error);
  return flattenBac(data as unknown as Record<string, unknown>);
}

export interface UpdateLuongThietLapBacPatch {
  he_so: number;
  thu_tu: number;
}

export async function updateLuongThietLapBac(id: string, patch: UpdateLuongThietLapBacPatch): Promise<LuongThietLapBacRow> {
  if (!Number.isFinite(patch.he_so) || patch.he_so <= 0) {
    throw new Error(txt('matTranThietLapLuong.validation.heSoInvalid'));
  }
  if (!isSupabase()) {
    for (const rows of Object.values(mockBacByNgach)) {
      const idx = rows.findIndex((r) => r.id === id);
      if (idx !== -1) {
        const now = new Date().toISOString();
        const u = {
          ...rows[idx],
          he_so: String(patch.he_so),
          thu_tu: patch.thu_tu,
          tg_cap_nhat: now,
        };
        rows[idx] = u;
        return u;
      }
    }
    throw new Error(txt('matTranThietLapLuong.service.notFound'));
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error(txt('matTranThietLapLuong.service.notFound'));
  const { data, error } = await supabase
    .from('luong_thiet_lap_bac_luong')
    .update({ he_so: patch.he_so, thu_tu: patch.thu_tu })
    .eq('id', id)
    .select(LUONG_THIET_LAP_BAC_RETURNING)
    .single();
  if (error) handleSupabaseError(error);
  return flattenBac(data as unknown as Record<string, unknown>);
}

export async function deleteLuongThietLapBac(id: string): Promise<void> {
  if (!isSupabase()) {
    for (const [ngachId, rows] of Object.entries(mockBacByNgach)) {
      const next = rows.filter((r) => r.id !== id);
      if (next.length !== rows.length) {
        mockBacByNgach[ngachId] = next;
        return;
      }
    }
    throw new Error(txt('matTranThietLapLuong.service.notFound'));
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error(txt('matTranThietLapLuong.service.notFound'));
  const { error } = await supabase.from('luong_thiet_lap_bac_luong').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

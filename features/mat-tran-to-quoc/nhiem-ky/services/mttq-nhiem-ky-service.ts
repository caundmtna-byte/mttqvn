import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { MttqNhiemKy, MttqNhiemKyListRow } from '../core/types';
import { mttqNhiemKySchema, type MttqNhiemKyFormInput, type MttqNhiemKyFormValues } from '../core/schema';
import { MTTQ_NHIEM_KY_SELECT_FULL, MTTQ_NHIEM_KY_SELECT_LIST } from '../core/supabase-select';
import { MTTQ_NHIEM_KY_MOCK } from '../mock-data';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'mttq_nhiem_ky',
  select: MTTQ_NHIEM_KY_SELECT_LIST,
  delay: 400,
  mockData: [],
});

function pickEmbedded<T extends Record<string, unknown>>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? undefined;
  return v as T;
}

function nullableStr(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

function nullableInt(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function intOrZero(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export function flattenRow(row: Record<string, unknown>): MttqNhiemKy {
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const rest = { ...row };
  delete rest.nguoi_tao;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id),
    ten_nhiem_ky: String(r.ten_nhiem_ky ?? ''),
    tu_nam: nullableInt(r.tu_nam),
    den_nam: nullableInt(r.den_nam),
    thong_tin: nullableStr(r.thong_tin),
    sl_dau_nhiem_ky: intOrZero(r.sl_dau_nhiem_ky),
    sl_dang_tham_gia: intOrZero(r.sl_dang_tham_gia),
    sl_thoi_tham_gia: intOrZero(r.sl_thoi_tham_gia),
    sl_can_bo_sung: intOrZero(r.sl_can_bo_sung),
    sl_thieu: intOrZero(r.sl_thieu),
    ghi_chu: nullableStr(r.ghi_chu),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
  };
}

let mockRows = structuredClone(MTTQ_NHIEM_KY_MOCK);

function mockNextId(): string {
  const maxId = Math.max(0, ...mockRows.map((r) => Number(r.id) || 0));
  return String(maxId + 1);
}

function payloadFromForm(data: MttqNhiemKyFormValues) {
  return {
    ten_nhiem_ky: data.ten_nhiem_ky,
    tu_nam: data.tu_nam,
    den_nam: data.den_nam,
    thong_tin: data.thong_tin,
    sl_dau_nhiem_ky: data.sl_dau_nhiem_ky,
    sl_dang_tham_gia: data.sl_dang_tham_gia,
    sl_thoi_tham_gia: data.sl_thoi_tham_gia,
    sl_can_bo_sung: data.sl_can_bo_sung,
    sl_thieu: data.sl_thieu,
    ghi_chu: data.ghi_chu,
  };
}

export async function getMttqNhiemKyList(): Promise<MttqNhiemKyListRow[]> {
  if (!isSupabase()) {
    return mockRows.map((r) => ({ ...r }));
  }
  const list = await repo.getAll({ orderBy: 'tu_nam', ascending: false });
  return list.map((row) => flattenRow(row as unknown as Record<string, unknown>));
}

export async function getMttqNhiemKyById(id: string): Promise<MttqNhiemKy | null> {
  if (!isSupabase()) {
    const r = mockRows.find((x) => x.id === id);
    return r ? { ...r } : null;
  }
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('mttq_nhiem_ky')
    .select(MTTQ_NHIEM_KY_SELECT_FULL)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenRow(data as unknown as Record<string, unknown>);
}

export async function createMttqNhiemKy(data: MttqNhiemKyFormValues, idNguoiTao: string): Promise<MttqNhiemKy> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('matTranNhiemKy.service.noEmployeeProfile'));

  if (!isSupabase()) {
    const id = mockNextId();
    const now = new Date().toISOString();
    const row: MttqNhiemKy = {
      id,
      ...payloadFromForm(data),
      id_nguoi_tao: trimmed,
      tg_tao: now,
      tg_cap_nhat: now,
      ho_va_ten_nguoi_tao: 'Mock',
      ten_tai_khoan_nguoi_tao: 'mock',
    };
    mockRows.push(row);
    return { ...row };
  }

  const inserted = await repo.insert(
    {
      ...payloadFromForm(data),
      id_nguoi_tao: trimmed,
    } as unknown as Omit<RepoRow, 'id'>,
    { returningSelect: MTTQ_NHIEM_KY_SELECT_FULL },
  );
  return flattenRow(inserted as unknown as Record<string, unknown>);
}

export async function updateMttqNhiemKy(id: string, data: MttqNhiemKyFormValues): Promise<MttqNhiemKy> {
  if (!isSupabase()) {
    const idx = mockRows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(txt('matTranNhiemKy.service.notFound'));
    const now = new Date().toISOString();
    mockRows[idx] = {
      ...mockRows[idx],
      ...payloadFromForm(data),
      tg_cap_nhat: now,
    };
    return { ...mockRows[idx] };
  }

  const updated = await repo.update(
    id,
    {
      ...payloadFromForm(data),
      tg_cap_nhat: new Date().toISOString(),
    } as unknown as Partial<RepoRow>,
    { returningSelect: MTTQ_NHIEM_KY_SELECT_FULL },
  );
  return flattenRow(updated as unknown as Record<string, unknown>);
}

export async function deleteMttqNhiemKyMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  if (!isSupabase()) {
    mockRows = mockRows.filter((r) => !ids.includes(r.id));
    return;
  }
  await repo.remove(ids);
}

function importRowToFormInput(row: Record<string, unknown>): MttqNhiemKyFormInput {
  const num = (v: unknown, def: number) => {
    if (v == null || String(v).trim() === '') return def;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : def;
  };
  return {
    ten_nhiem_ky: String(row.ten_nhiem_ky ?? '').trim(),
    tu_nam: row.tu_nam != null && String(row.tu_nam).trim() !== '' ? String(row.tu_nam) : '',
    den_nam: row.den_nam != null && String(row.den_nam).trim() !== '' ? String(row.den_nam) : '',
    thong_tin: row.thong_tin != null && String(row.thong_tin).trim() !== '' ? String(row.thong_tin) : undefined,
    ghi_chu: row.ghi_chu != null && String(row.ghi_chu).trim() !== '' ? String(row.ghi_chu) : undefined,
    sl_dau_nhiem_ky: num(row.sl_dau_nhiem_ky, 0),
    sl_dang_tham_gia: num(row.sl_dang_tham_gia, 0),
    sl_thoi_tham_gia: num(row.sl_thoi_tham_gia, 0),
    sl_can_bo_sung: num(row.sl_can_bo_sung, 0),
    sl_thieu: num(row.sl_thieu, 0),
  };
}

/** Import nhiều nhiệm kỳ (chỉ thêm mới). Cột khớp export / form. */
export async function importMttqNhiemKy(
  rows: Record<string, unknown>[],
  idNguoiTao: string,
): Promise<{ created: number; errors: string[] }> {
  const trimmedNv = idNguoiTao.trim();
  if (!trimmedNv) throw new Error(txt('matTranNhiemKy.service.noEmployeeProfile'));

  const errors: string[] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const input = importRowToFormInput(raw);
    const parsed = mttqNhiemKySchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
      errors.push(txt('matTranNhiemKy.import.rowError', { row: i + 2, message: msg }));
      continue;
    }
    const data = parsed.data as MttqNhiemKyFormValues;
    try {
      await createMttqNhiemKy(data, trimmedNv);
      created++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(txt('matTranNhiemKy.import.rowError', { row: i + 2, message: msg }));
    }
  }

  return { created, errors };
}

import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { MttqNhiemKy, MttqNhiemKyListRow } from '../core/types';
import type { MttqNhiemKyFormValues } from '../core/schema';
import { MTTQ_NHIEM_KY_RETURNING, MTTQ_NHIEM_KY_SELECT_FULL, MTTQ_NHIEM_KY_SELECT_LIST } from '../core/supabase-select';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'mttq_nhiem_ky',
  select: MTTQ_NHIEM_KY_SELECT_LIST,
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
  const nk = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_khoa);
  const rest = { ...row };
  delete rest.nguoi_tao;
  delete rest.nguoi_khoa;
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
    da_khoa: r.da_khoa === true,
    tg_khoa: nullableStr(r.tg_khoa),
    nguoi_khoa_id: nullableStr(r.nguoi_khoa_id),
    ho_va_ten_nguoi_khoa: nk?.ho_va_ten ?? nk?.ten_tai_khoan ?? null,
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
  };
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
  const list = await repo.getAll({ orderBy: 'tu_nam', ascending: false });
  return list.map((row) => flattenRow(row as unknown as Record<string, unknown>));
}

export async function getMttqNhiemKyById(id: string): Promise<MttqNhiemKy | null> {
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

  const inserted = await repo.insert(
    {
      ...payloadFromForm(data),
      id_nguoi_tao: trimmed,
    } as unknown as Omit<RepoRow, 'id'>,
    { returningSelect: MTTQ_NHIEM_KY_RETURNING },
  );
  const id = String((inserted as { id: string }).id);
  const full = await getMttqNhiemKyById(id);
  if (!full) throw new Error(txt('matTranNhiemKy.service.notFound'));
  return full;
}

export async function updateMttqNhiemKy(id: string, data: MttqNhiemKyFormValues): Promise<MttqNhiemKy> {
  await repo.update(
    id,
    {
      ...payloadFromForm(data),
      tg_cap_nhat: new Date().toISOString(),
    } as unknown as Partial<RepoRow>,
    { returningSelect: MTTQ_NHIEM_KY_RETURNING },
  );
  const full = await getMttqNhiemKyById(id);
  if (!full) throw new Error(txt('matTranNhiemKy.service.notFound'));
  return full;
}

/**
 * Khoá sổ / mở khoá nhiệm kỳ.
 *
 * Chỉ gửi đúng cột `da_khoa`: `tg_khoa` và `nguoi_khoa_id` do trigger ở máy chủ
 * gán (client có gửi cũng bị ghi đè), và quyền khoá cũng do trigger kiểm bằng
 * `fn_co_quyen('nhiem-ky','sua')` — xem `20260801100000_khoa_ky.sql`.
 */
export async function setMttqNhiemKyDaKhoa(id: string, daKhoa: boolean): Promise<MttqNhiemKy> {
  const supabase = getSupabase();
  if (!supabase) throw new Error(txt('matTranNhiemKy.service.notFound'));
  const { error } = await supabase
    .from('mttq_nhiem_ky')
    .update({ da_khoa: daKhoa })
    .eq('id', id)
    .select(MTTQ_NHIEM_KY_RETURNING)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  const full = await getMttqNhiemKyById(id);
  if (!full) throw new Error(txt('matTranNhiemKy.service.notFound'));
  return full;
}

export async function deleteMttqNhiemKyMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await repo.remove(ids);
}

/**
 * Ghi cho luồng nhập file (`nhiem-ky-import.ts`): payload đã dựng sẵn, chỉ trả
 * `id` — không đọc lại cả hồ sơ cho mỗi dòng Excel.
 */
export async function insertMttqNhiemKyForImport(
  payload: Record<string, unknown>,
  idNguoiTao: string,
): Promise<void> {
  await repo.insert({ ...payload, id_nguoi_tao: idNguoiTao } as unknown as Omit<RepoRow, 'id'>, {
    returningSelect: 'id',
  });
}

/** Ghi đè MỘT PHẦN — `payload` chỉ gồm các cột có trong file. */
export async function updateMttqNhiemKyPartial(id: string, payload: Record<string, unknown>): Promise<void> {
  if (Object.keys(payload).length === 0) return;
  await repo.update(
    id,
    { ...payload, tg_cap_nhat: new Date().toISOString() } as unknown as Partial<RepoRow>,
    { returningSelect: 'id' },
  );
}

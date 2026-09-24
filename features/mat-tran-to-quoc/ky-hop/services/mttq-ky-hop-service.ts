import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { fetchAllPages } from '@/lib/supabase/fetch-all-pages';
import type { MttqKyHop, MttqKyHopDiemDanhSummary, MttqKyHopListRow } from '../core/types';
import { getDiemDanhSummariesForKyHopIds } from './mttq-diem-danh-service';
import type { MttqKyHopFormValues } from '../core/schema';
import { MTTQ_KY_HOP_RETURNING, MTTQ_KY_HOP_SELECT_FULL, MTTQ_KY_HOP_SELECT_LIST } from '../core/supabase-select';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'mttq_ky_hop',
  select: MTTQ_KY_HOP_SELECT_LIST,
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

function mergeDiemDanhSummary(row: MttqKyHop, s?: MttqKyHopDiemDanhSummary): MttqKyHop {
  return {
    ...row,
    diem_danh_co_mat: s?.co_mat ?? 0,
    diem_danh_vang_mat: s?.vang_mat ?? 0,
    diem_danh_chua: s?.chua_diem_danh ?? 0,
  };
}

async function withDiemDanhSummaries(rows: MttqKyHop[]): Promise<MttqKyHop[]> {
  if (rows.length === 0) return rows;
  const map = await getDiemDanhSummariesForKyHopIds(rows.map((r) => r.id));
  return rows.map((r) => mergeDiemDanhSummary(r, map.get(r.id)));
}

export function flattenRow(row: Record<string, unknown>): MttqKyHop {
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const nk = pickEmbedded<{ ten_nhiem_ky?: string }>(row.nhiem_ky);
  const dv = pickEmbedded<{ ten?: string }>(row.don_vi);
  const rest = { ...row };
  delete rest.nguoi_tao;
  delete rest.nhiem_ky;
  delete rest.don_vi;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id),
    nhiem_ky_id: String(r.nhiem_ky_id ?? ''),
    ten_nhiem_ky: String(nk?.ten_nhiem_ky ?? ''),
    don_vi_id: r.don_vi_id == null || r.don_vi_id === '' ? null : String(r.don_vi_id),
    ten_don_vi: dv?.ten != null && String(dv.ten).trim() !== '' ? String(dv.ten) : null,
    ky_thu: String(r.ky_thu ?? ''),
    ngay_hop: nullableStr(r.ngay_hop),
    noi_dung_ky_hop: nullableStr(r.noi_dung_ky_hop),
    tai_lieu_hop: nullableStr(r.tai_lieu_hop),
    ghi_chu: nullableStr(r.ghi_chu),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
    diem_danh_co_mat: 0,
    diem_danh_vang_mat: 0,
    diem_danh_chua: 0,
  };
}

function payloadFromForm(data: MttqKyHopFormValues) {
  return {
    nhiem_ky_id: data.nhiem_ky_id,
    don_vi_id: data.don_vi_id,
    ky_thu: data.ky_thu,
    ngay_hop: data.ngay_hop,
    noi_dung_ky_hop: data.noi_dung_ky_hop,
    tai_lieu_hop: data.tai_lieu_hop,
    ghi_chu: data.ghi_chu,
  };
}

export async function getMttqKyHopList(): Promise<MttqKyHopListRow[]> {
  const list = await repo.getAll({ orderBy: 'ngay_hop', ascending: false });
  const flat = list.map((row) => flattenRow(row as unknown as Record<string, unknown>));
  return withDiemDanhSummaries(flat);
}

/** Danh sách kỳ họp thuộc một nhiệm kỳ (drawer chi tiết nhiệm kỳ). */
export async function getMttqKyHopListForNhiemKyId(nhiemKyId: string): Promise<MttqKyHopListRow[]> {
  const id = nhiemKyId.trim();
  if (!id) return [];
  const supabase = getSupabase();
  if (!supabase) return [];
  // Đọc ĐỦ số kỳ họp của nhiệm kỳ — không cắt ở một con số cứng.
  const data = await fetchAllPages<Record<string, unknown>>(
    async (from, to) => {
      const { data: rows, error } = await supabase
        .from('mttq_ky_hop')
        .select(MTTQ_KY_HOP_SELECT_LIST)
        .eq('nhiem_ky_id', id)
        .order('ngay_hop', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);
      if (error) handleSupabaseError(error);
      return (rows ?? []) as unknown as Record<string, unknown>[];
    },
    { label: 'mttq_ky_hop' },
  );
  const flat = data.map((row) => flattenRow(row));
  return withDiemDanhSummaries(flat);
}

export async function getMttqKyHopById(id: string): Promise<MttqKyHop | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('mttq_ky_hop')
    .select(MTTQ_KY_HOP_SELECT_FULL)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  const flat = flattenRow(data as unknown as Record<string, unknown>);
  const [merged] = await withDiemDanhSummaries([flat]);
  return merged ?? null;
}

export async function createMttqKyHop(data: MttqKyHopFormValues, idNguoiTao: string): Promise<MttqKyHop> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('matTranKyHop.service.noEmployeeProfile'));

  const inserted = await repo.insert(
    {
      ...payloadFromForm(data),
      id_nguoi_tao: trimmed,
    } as unknown as Omit<RepoRow, 'id'>,
    { returningSelect: MTTQ_KY_HOP_RETURNING },
  );
  const id = String((inserted as { id: string }).id);
  const full = await getMttqKyHopById(id);
  if (!full) throw new Error(txt('matTranKyHop.service.notFound'));
  return full;
}

export async function updateMttqKyHop(id: string, data: MttqKyHopFormValues): Promise<MttqKyHop> {
  await repo.update(
    id,
    {
      ...payloadFromForm(data),
      tg_cap_nhat: new Date().toISOString(),
    } as unknown as Partial<RepoRow>,
    { returningSelect: MTTQ_KY_HOP_RETURNING },
  );
  const full = await getMttqKyHopById(id);
  if (!full) throw new Error(txt('matTranKyHop.service.notFound'));
  return full;
}

export async function deleteMttqKyHopMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await repo.remove(ids);
}

/**
 * Ghi cho luồng nhập file (`ky-hop-import.ts`): payload đã dựng sẵn, chỉ trả
 * `id` — không đọc lại cả hồ sơ + điểm danh cho mỗi dòng Excel.
 */
export async function insertMttqKyHopForImport(payload: Record<string, unknown>, idNguoiTao: string): Promise<void> {
  await repo.insert({ ...payload, id_nguoi_tao: idNguoiTao } as unknown as Omit<RepoRow, 'id'>, {
    returningSelect: 'id',
  });
}

/** Ghi đè MỘT PHẦN — `payload` chỉ gồm các cột có trong file. */
export async function updateMttqKyHopPartial(id: string, payload: Record<string, unknown>): Promise<void> {
  if (Object.keys(payload).length === 0) return;
  await repo.update(
    id,
    { ...payload, tg_cap_nhat: new Date().toISOString() } as unknown as Partial<RepoRow>,
    { returningSelect: 'id' },
  );
}

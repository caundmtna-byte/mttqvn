import { createRepository } from '@/lib/data/create-repository';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { khoDonViCuuTroLoaiLabel, parseKhoDonViCuuTroLoai } from '../core/loai';
import {
  donViGioiThieuLabel,
  donViGioiThieuToPayload,
  parseDonViGioiThieuLoai,
} from '../utils/don-vi-gioi-thieu';
import type { KhoDonViCuuTroDetail, KhoDonViCuuTroListRow } from '../core/types';
import type { KhoDonViCuuTroFormValues } from '../core/schema';
import type { DonViCuuTroUngHoNhom } from '../utils/ung-ho-nhom';
import { KHO_DON_VI_CUU_TRO_RETURNING, KHO_DON_VI_CUU_TRO_SELECT } from '../core/supabase-select';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'kho_don_vi_cuu_tro',
  select: KHO_DON_VI_CUU_TRO_SELECT,
});

function nullableStr(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

function nullableNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** PostgREST trả quan hệ embed dạng object (hoặc mảng một phần tử). */
function pickEmbedded<T extends Record<string, unknown>>(v: unknown): T | undefined {
  if (Array.isArray(v)) return v[0] as T | undefined;
  if (v && typeof v === 'object') return v as T;
  return undefined;
}

export function flattenKhoDonViCuuTroRow(row: Record<string, unknown>): KhoDonViCuuTroListRow {
  const r = row as Record<string, unknown>;
  const loai = parseKhoDonViCuuTroLoai(r.loai);
  const dvGioiThieuLoai = parseDonViGioiThieuLoai(r.don_vi_gioi_thieu_loai) ?? 'tinh';
  const xa = pickEmbedded<{ ten?: string }>(r.don_vi_gioi_thieu);
  const tenDonViGioiThieu = nullableStr(xa?.ten);
  return {
    id: String(r.id ?? ''),
    tt: Number(r.tt ?? 0),
    loai,
    loai_label: khoDonViCuuTroLoaiLabel(loai),
    ten: String(r.ten ?? ''),
    so_nguoi: nullableNum(r.so_nguoi),
    nguoi_dai_dien: nullableStr(r.nguoi_dai_dien),
    chuc_vu: nullableStr(r.chuc_vu),
    dia_chi: nullableStr(r.dia_chi),
    dien_thoai: nullableStr(r.dien_thoai),
    don_vi_gioi_thieu_loai: dvGioiThieuLoai,
    don_vi_gioi_thieu_id: nullableStr(r.don_vi_gioi_thieu_id),
    ten_don_vi_gioi_thieu: tenDonViGioiThieu,
    don_vi_gioi_thieu_label: donViGioiThieuLabel(dvGioiThieuLoai, tenDonViGioiThieu),
    email: nullableStr(r.email),
    ghi_chu: nullableStr(r.ghi_chu),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    tien_mat_ung_ho: null,
    hien_vat_ung_ho: null,
    ket_qua_ung_ho: null,
  };
}

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t === '' ? null : t;
}

export function khoDonViCuuTroFormToPayload(data: KhoDonViCuuTroFormValues): Record<string, unknown> {
  return {
    loai: data.loai,
    ten: data.ten.trim(),
    so_nguoi: nullableNum(data.so_nguoi.trim()),
    nguoi_dai_dien: emptyToNull(data.nguoi_dai_dien),
    chuc_vu: emptyToNull(data.chuc_vu),
    dia_chi: emptyToNull(data.dia_chi),
    dien_thoai: emptyToNull(data.dien_thoai),
    ...donViGioiThieuToPayload(data.don_vi_gioi_thieu),
    email: emptyToNull(data.email),
    ghi_chu: emptyToNull(data.ghi_chu),
  };
}

function toSo(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Kết quả ủng hộ gom theo đơn vị × nhóm (đợt cứu trợ / nội dung hỗ trợ), tách tiền
 * mặt và hiện vật — RPC `get_kho_don_vi_cuu_tro_ung_ho_nhom`. Khoảng ngày
 * `YYYY-MM-DD`, chuỗi rỗng = không chặn đầu đó. Chỉ có nhóm có phát sinh.
 */
export async function getKhoDonViCuuTroUngHoNhom(
  tuNgay: string,
  denNgay: string,
): Promise<DonViCuuTroUngHoNhom[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('get_kho_don_vi_cuu_tro_ung_ho_nhom', {
    p_tu_ngay: tuNgay || null,
    p_den_ngay: denNgay || null,
  });
  if (error) handleSupabaseError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    donViId: String(r.don_vi_id),
    nguon: r.nguon === 'kho' ? 'kho' : 'chuong_trinh',
    nhomKey: String(r.nhom_key ?? ''),
    nhomTen: r.nhom_ten == null ? null : String(r.nhom_ten),
    tienMat: toSo(r.tien_mat),
    hienVat: toSo(r.hien_vat),
    soLuot: toSo(r.so_luot),
  }));
}

/**
 * Danh sách đơn vị — KHÔNG kèm số ủng hộ: trang tự ghép từ
 * `getKhoDonViCuuTroUngHoNhom` để còn lọc được theo đợt / nội dung.
 */
export async function getKhoDonViCuuTroList(): Promise<KhoDonViCuuTroListRow[]> {
  const list = await repo.getAll({ orderBy: 'tt', ascending: true });
  return list.map((row) => flattenKhoDonViCuuTroRow(row as unknown as Record<string, unknown>));
}

export async function getKhoDonViCuuTroById(id: string): Promise<KhoDonViCuuTroDetail | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('kho_don_vi_cuu_tro')
    .select(KHO_DON_VI_CUU_TRO_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenKhoDonViCuuTroRow(data as unknown as Record<string, unknown>);
}

export async function createKhoDonViCuuTro(data: KhoDonViCuuTroFormValues): Promise<KhoDonViCuuTroListRow> {
  const payload = khoDonViCuuTroFormToPayload(data);
  const inserted = await repo.insert(payload as unknown as Omit<RepoRow, 'id'>, {
    returningSelect: KHO_DON_VI_CUU_TRO_RETURNING,
  });
  return flattenKhoDonViCuuTroRow(inserted as unknown as Record<string, unknown>);
}

export async function updateKhoDonViCuuTro(id: string, data: KhoDonViCuuTroFormValues): Promise<KhoDonViCuuTroListRow> {
  const payload = khoDonViCuuTroFormToPayload(data);
  const updated = await repo.update(id, payload as unknown as Partial<RepoRow>, {
    returningSelect: KHO_DON_VI_CUU_TRO_RETURNING,
  });
  return flattenKhoDonViCuuTroRow(updated as unknown as Record<string, unknown>);
}

export async function deleteKhoDonViCuuTroMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await repo.remove(ids);
}

/**
 * Ghi cho luồng nhập file (`don-vi-cuu-tro-import.ts`): payload đã dựng sẵn,
 * chỉ trả `id` — không kéo lại cả dòng cho mỗi dòng Excel.
 */
export async function insertKhoDonViCuuTroForImport(payload: Record<string, unknown>): Promise<void> {
  await repo.insert(payload as unknown as Omit<RepoRow, 'id'>, { returningSelect: 'id' });
}

/** Ghi đè MỘT PHẦN — `payload` chỉ gồm các cột có trong file. */
export async function updateKhoDonViCuuTroPartial(id: string, payload: Record<string, unknown>): Promise<void> {
  if (Object.keys(payload).length === 0) return;
  await repo.update(id, payload as unknown as Partial<RepoRow>, { returningSelect: 'id' });
}

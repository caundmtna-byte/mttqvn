import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import type { ThongTinCaNhanTieuBieu } from '../core/types';
import type { ThongTinCaNhanTieuBieuFormValues } from '../core/schema';
import {
  DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_RETURNING,
  DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_SELECT,
} from '../core/supabase-select';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'dttg_thong_tin_ca_nhan_tieu_bieu',
  select: DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_SELECT,
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

export function flattenThongTinCaNhanTieuBieuRow(row: Record<string, unknown>): ThongTinCaNhanTieuBieu {
  const dv = pickEmbedded<{ ten?: string; var_ssn_tinh_thanh?: unknown }>(row.don_vi);
  const tinh = pickEmbedded<{ ten?: string }>(dv?.var_ssn_tinh_thanh);
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const rest = { ...row };
  delete rest.don_vi;
  delete rest.nguoi_tao;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id ?? ''),
    ho_va_ten: String(r.ho_va_ten ?? ''),
    ngay_sinh: nullableStr(r.ngay_sinh),
    doi_tuong: String(r.doi_tuong ?? ''),
    chuc_vu_vi_tri: nullableStr(r.chuc_vu_vi_tri),
    ton_giao_dan_toc: nullableStr(r.ton_giao_dan_toc),
    dia_chi: nullableStr(r.dia_chi),
    don_vi_id: r.don_vi_id == null || r.don_vi_id === '' ? null : String(r.don_vi_id),
    ten_don_vi: dv?.ten != null && String(dv.ten).trim() !== '' ? String(dv.ten) : null,
    ten_tinh: tinh?.ten != null && String(tinh.ten).trim() !== '' ? String(tinh.ten) : null,
    so_dien_thoai: nullableStr(r.so_dien_thoai),
    dong_gop_noi_bat: nullableStr(r.dong_gop_noi_bat),
    trang_thai: String(r.trang_thai ?? 'Đang hoạt động') as ThongTinCaNhanTieuBieu['trang_thai'],
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
  };
}

export function formToPayload(data: ThongTinCaNhanTieuBieuFormValues): Record<string, unknown> {
  return {
    ho_va_ten: data.ho_va_ten,
    ngay_sinh: data.ngay_sinh,
    doi_tuong: data.doi_tuong,
    chuc_vu_vi_tri: data.chuc_vu_vi_tri,
    ton_giao_dan_toc: data.ton_giao_dan_toc,
    dia_chi: data.dia_chi,
    don_vi_id: data.don_vi_id != null && data.don_vi_id !== '' ? Number(data.don_vi_id) : null,
    so_dien_thoai: data.so_dien_thoai,
    dong_gop_noi_bat: data.dong_gop_noi_bat,
    trang_thai: data.trang_thai,
  };
}

export async function getThongTinCaNhanTieuBieuList(): Promise<ThongTinCaNhanTieuBieu[]> {
  const list = await repo.getAll({ orderBy: 'tg_cap_nhat', ascending: false });
  return list.map((row) => flattenThongTinCaNhanTieuBieuRow(row as unknown as Record<string, unknown>));
}

export async function getThongTinCaNhanTieuBieuById(id: string): Promise<ThongTinCaNhanTieuBieu | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('dttg_thong_tin_ca_nhan_tieu_bieu')
    .select(DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenThongTinCaNhanTieuBieuRow(data as unknown as Record<string, unknown>);
}

export async function createThongTinCaNhanTieuBieu(
  data: ThongTinCaNhanTieuBieuFormValues,
  idNguoiTao: string,
): Promise<ThongTinCaNhanTieuBieu> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('danTocCaNhanTieuBieu.service.noEmployeeProfile'));

  const inserted = await repo.insert(
    { ...formToPayload(data), id_nguoi_tao: Number(trimmed) },
    { returningSelect: DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_RETURNING },
  );
  return flattenThongTinCaNhanTieuBieuRow(inserted as unknown as Record<string, unknown>);
}

export async function updateThongTinCaNhanTieuBieu(
  id: string,
  data: ThongTinCaNhanTieuBieuFormValues,
): Promise<ThongTinCaNhanTieuBieu> {
  const updated = await repo.update(id, formToPayload(data) as unknown as Partial<RepoRow>, {
    returningSelect: DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_RETURNING,
  });
  return flattenThongTinCaNhanTieuBieuRow(updated as unknown as Record<string, unknown>);
}

export async function updateThongTinCaNhanTieuBieuStatus(
  id: string,
  trangThai: TrangThaiHoatDong,
): Promise<ThongTinCaNhanTieuBieu> {
  const updated = await repo.update(
    id,
    { trang_thai: trangThai } as unknown as Partial<RepoRow>,
    { returningSelect: DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_RETURNING },
  );
  return flattenThongTinCaNhanTieuBieuRow(updated as unknown as Record<string, unknown>);
}

export async function deleteThongTinCaNhanTieuBieuMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await repo.remove(ids);
}

/** Thêm mới từ file nhập — chỉ trả `id`, không kéo embed về cho từng dòng. */
export async function insertThongTinCaNhanTieuBieuFromImport(
  data: ThongTinCaNhanTieuBieuFormValues,
  idNguoiTao: string,
): Promise<void> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('danTocCaNhanTieuBieu.service.noEmployeeProfile'));
  await repo.insert({ ...formToPayload(data), id_nguoi_tao: Number(trimmed) }, { returningSelect: 'id' });
}

/**
 * Ghi đè từ file nhập: chỉ các cột có trong file (payload đã qua `pickMappedColumns`).
 * Không kéo lại bản ghi đầy đủ sau khi ghi — trả `id` là đủ.
 */
export async function updateThongTinCaNhanTieuBieuPartial(
  id: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await repo.update(
    id,
    { ...payload, tg_cap_nhat: new Date().toISOString() } as unknown as Partial<RepoRow>,
    { returningSelect: 'id' },
  );
}

import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import type { ThongTinToChucQuanTrong } from '../core/types';
import type { ThongTinToChucQuanTrongFormValues } from '../core/schema';
import {
  DTTG_THONG_TIN_TO_CHUC_QUAN_TRONG_RETURNING,
  DTTG_THONG_TIN_TO_CHUC_QUAN_TRONG_SELECT,
} from '../core/supabase-select';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'dttg_thong_tin_to_chuc_quan_trong',
  select: DTTG_THONG_TIN_TO_CHUC_QUAN_TRONG_SELECT,
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

export function flattenThongTinToChucQuanTrongRow(row: Record<string, unknown>): ThongTinToChucQuanTrong {
  const dv = pickEmbedded<{ ten?: string; var_ssn_tinh_thanh?: unknown }>(row.don_vi);
  const tinh = pickEmbedded<{ ten?: string }>(dv?.var_ssn_tinh_thanh);
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const rest = { ...row };
  delete rest.don_vi;
  delete rest.nguoi_tao;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id ?? ''),
    loai_hinh: String(r.loai_hinh ?? ''),
    ten_co_so: String(r.ten_co_so ?? ''),
    chu_tri: nullableStr(r.chu_tri),
    lich_su_hinh_thanh: nullableStr(r.lich_su_hinh_thanh),
    cong_tac_an_sinh: nullableStr(r.cong_tac_an_sinh),
    don_vi_id: r.don_vi_id == null || r.don_vi_id === '' ? null : String(r.don_vi_id),
    ten_don_vi: dv?.ten != null && String(dv.ten).trim() !== '' ? String(dv.ten) : null,
    ten_tinh: tinh?.ten != null && String(tinh.ten).trim() !== '' ? String(tinh.ten) : null,
    dia_chi: nullableStr(r.dia_chi),
    so_dien_thoai: nullableStr(r.so_dien_thoai),
    trang_thai: String(r.trang_thai ?? 'Đang hoạt động') as ThongTinToChucQuanTrong['trang_thai'],
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
  };
}

export function formToPayload(data: ThongTinToChucQuanTrongFormValues): Record<string, unknown> {
  return {
    loai_hinh: data.loai_hinh,
    ten_co_so: data.ten_co_so,
    chu_tri: data.chu_tri,
    lich_su_hinh_thanh: data.lich_su_hinh_thanh,
    cong_tac_an_sinh: data.cong_tac_an_sinh,
    don_vi_id: data.don_vi_id != null && data.don_vi_id !== '' ? Number(data.don_vi_id) : null,
    dia_chi: data.dia_chi,
    so_dien_thoai: data.so_dien_thoai,
    trang_thai: data.trang_thai,
  };
}

export async function getThongTinToChucQuanTrongList(): Promise<ThongTinToChucQuanTrong[]> {
  const list = await repo.getAll({ orderBy: 'tg_cap_nhat', ascending: false });
  return list.map((row) => flattenThongTinToChucQuanTrongRow(row as unknown as Record<string, unknown>));
}

export async function getThongTinToChucQuanTrongById(id: string): Promise<ThongTinToChucQuanTrong | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('dttg_thong_tin_to_chuc_quan_trong')
    .select(DTTG_THONG_TIN_TO_CHUC_QUAN_TRONG_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenThongTinToChucQuanTrongRow(data as unknown as Record<string, unknown>);
}

export async function createThongTinToChucQuanTrong(
  data: ThongTinToChucQuanTrongFormValues,
  idNguoiTao: string,
): Promise<ThongTinToChucQuanTrong> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('danTocToChucQuanTrong.service.noEmployeeProfile'));

  const inserted = await repo.insert(
    { ...formToPayload(data), id_nguoi_tao: Number(trimmed) },
    { returningSelect: DTTG_THONG_TIN_TO_CHUC_QUAN_TRONG_RETURNING },
  );
  return flattenThongTinToChucQuanTrongRow(inserted as unknown as Record<string, unknown>);
}

export async function updateThongTinToChucQuanTrong(
  id: string,
  data: ThongTinToChucQuanTrongFormValues,
): Promise<ThongTinToChucQuanTrong> {
  const updated = await repo.update(id, formToPayload(data) as unknown as Partial<RepoRow>, {
    returningSelect: DTTG_THONG_TIN_TO_CHUC_QUAN_TRONG_RETURNING,
  });
  return flattenThongTinToChucQuanTrongRow(updated as unknown as Record<string, unknown>);
}

export async function updateThongTinToChucQuanTrongStatus(
  id: string,
  trangThai: TrangThaiHoatDong,
): Promise<ThongTinToChucQuanTrong> {
  const updated = await repo.update(
    id,
    { trang_thai: trangThai } as unknown as Partial<RepoRow>,
    { returningSelect: DTTG_THONG_TIN_TO_CHUC_QUAN_TRONG_RETURNING },
  );
  return flattenThongTinToChucQuanTrongRow(updated as unknown as Record<string, unknown>);
}

export async function deleteThongTinToChucQuanTrongMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await repo.remove(ids);
}

/** Thêm mới từ file nhập — chỉ trả `id`, không kéo embed về cho từng dòng. */
export async function insertThongTinToChucQuanTrongFromImport(
  data: ThongTinToChucQuanTrongFormValues,
  idNguoiTao: string,
): Promise<void> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('danTocToChucQuanTrong.service.noEmployeeProfile'));
  await repo.insert({ ...formToPayload(data), id_nguoi_tao: Number(trimmed) }, { returningSelect: 'id' });
}

/**
 * Ghi đè từ file nhập: chỉ các cột có trong file (payload đã qua `pickMappedColumns`).
 * Không kéo lại bản ghi đầy đủ sau khi ghi — trả `id` là đủ.
 */
export async function updateThongTinToChucQuanTrongPartial(
  id: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await repo.update(
    id,
    { ...payload, tg_cap_nhat: new Date().toISOString() } as unknown as Partial<RepoRow>,
    { returningSelect: 'id' },
  );
}

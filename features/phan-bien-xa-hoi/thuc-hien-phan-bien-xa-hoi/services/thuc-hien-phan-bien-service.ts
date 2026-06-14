import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { ThucHienPhanBienFormValues } from '../core/schema';
import type { ThucHienPhanBien } from '../core/types';
import type { CapThucHien, LoaiHinh, TinhTrang } from '../core/constants';
import { TINH_TRANG_DEFAULT } from '../core/constants';
import { PBXH_THUC_HIEN_RETURNING, PBXH_THUC_HIEN_SELECT } from '../core/supabase-select';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'pbxh_thuc_hien_phan_bien_xa_hoi',
  select: PBXH_THUC_HIEN_SELECT,
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

function nullableFk(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function flattenThucHienPhanBienRow(row: Record<string, unknown>): ThucHienPhanBien {
  const dt = pickEmbedded<{ ten?: string }>(row.doi_tuong);
  const dvc = pickEmbedded<{ ten?: string }>(row.don_vi_chu_tri);
  const ht = pickEmbedded<{ ten?: string }>(row.hinh_thuc);
  const pb = pickEmbedded<{ ten_phong_ban?: string }>(row.phong_ban);
  const dv = pickEmbedded<{ ten?: string }>(row.don_vi_thuc_hien);
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const rest = { ...row };
  delete rest.doi_tuong;
  delete rest.don_vi_chu_tri;
  delete rest.hinh_thuc;
  delete rest.phong_ban;
  delete rest.don_vi_thuc_hien;
  delete rest.nguoi_tao;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id ?? ''),
    cap_thuc_hien: String(r.cap_thuc_hien ?? '') as CapThucHien,
    loai_hinh: String(r.loai_hinh ?? '') as LoaiHinh,
    noi_dung: String(r.noi_dung ?? ''),
    doi_tuong_id: nullableStr(r.doi_tuong_id),
    ten_doi_tuong: dt?.ten != null && String(dt.ten).trim() !== '' ? String(dt.ten) : null,
    hinh_thuc_id: nullableStr(r.hinh_thuc_id),
    ten_hinh_thuc: ht?.ten != null && String(ht.ten).trim() !== '' ? String(ht.ten) : null,
    ngay_bat_dau: nullableStr(r.ngay_bat_dau),
    ngay_ket_thuc: nullableStr(r.ngay_ket_thuc),
    mo_ta_thoi_gian: nullableStr(r.mo_ta_thoi_gian),
    tinh_trang: String(r.tinh_trang ?? TINH_TRANG_DEFAULT) as TinhTrang,
    don_vi_chu_tri_id: nullableStr(r.don_vi_chu_tri_id),
    ten_don_vi_chu_tri: dvc?.ten != null && String(dvc.ten).trim() !== '' ? String(dvc.ten) : null,
    phong_ban_tham_muu_id: nullableStr(r.phong_ban_tham_muu_id),
    ten_phong_ban: pb?.ten_phong_ban != null && String(pb.ten_phong_ban).trim() !== '' ? String(pb.ten_phong_ban) : null,
    don_vi_thuc_hien_id: nullableStr(r.don_vi_thuc_hien_id),
    ten_don_vi_thuc_hien: dv?.ten != null && String(dv.ten).trim() !== '' ? String(dv.ten) : null,
    ket_qua_kien_nghi: nullableStr(r.ket_qua_kien_nghi),
    so_lan_hoan_thanh: Number(r.so_lan_hoan_thanh ?? 0),
    so_lan_khao_sat: Number(r.so_lan_khao_sat ?? 0),
    phan_tram_hoan_thanh: Number(r.phan_tram_hoan_thanh ?? 0),
    link_ket_qua: nullableStr(r.link_ket_qua),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
  };
}

function formToPayload(data: ThucHienPhanBienFormValues): Record<string, unknown> {
  return {
    cap_thuc_hien: data.cap_thuc_hien,
    loai_hinh: data.loai_hinh,
    noi_dung: data.noi_dung,
    doi_tuong_id: nullableFk(data.doi_tuong_id),
    hinh_thuc_id: nullableFk(data.hinh_thuc_id),
    ngay_bat_dau: data.ngay_bat_dau ?? null,
    ngay_ket_thuc: data.ngay_ket_thuc ?? null,
    mo_ta_thoi_gian: data.mo_ta_thoi_gian ?? null,
    tinh_trang: data.tinh_trang,
    don_vi_chu_tri_id: nullableFk(data.don_vi_chu_tri_id),
    phong_ban_tham_muu_id: nullableFk(data.phong_ban_tham_muu_id),
    don_vi_thuc_hien_id: nullableFk(data.don_vi_thuc_hien_id),
    ket_qua_kien_nghi: data.ket_qua_kien_nghi ?? null,
    so_lan_hoan_thanh: data.so_lan_hoan_thanh ?? 0,
    so_lan_khao_sat: data.so_lan_khao_sat ?? 0,
    link_ket_qua: data.link_ket_qua ?? null,
  };
}

export async function getThucHienPhanBienList(): Promise<ThucHienPhanBien[]> {
  const list = await repo.getAll({ orderBy: 'tg_cap_nhat', ascending: false });
  return list.map((row) => flattenThucHienPhanBienRow(row as unknown as Record<string, unknown>));
}

export async function getThucHienPhanBienById(id: string): Promise<ThucHienPhanBien | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('pbxh_thuc_hien_phan_bien_xa_hoi')
    .select(PBXH_THUC_HIEN_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenThucHienPhanBienRow(data as unknown as Record<string, unknown>);
}

export async function createThucHienPhanBien(
  data: ThucHienPhanBienFormValues,
  idNguoiTao: string,
): Promise<ThucHienPhanBien> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('pbxhThucHien.service.noEmployeeProfile'));

  const inserted = await repo.insert(
    {
      ...formToPayload(data),
      id_nguoi_tao: Number(trimmed),
      tg_tao: new Date().toISOString(),
      tg_cap_nhat: new Date().toISOString(),
    },
    { returningSelect: PBXH_THUC_HIEN_RETURNING },
  );
  return flattenThucHienPhanBienRow(inserted as unknown as Record<string, unknown>);
}

export async function updateThucHienPhanBien(
  id: string,
  data: ThucHienPhanBienFormValues,
): Promise<ThucHienPhanBien> {
  const updated = await repo.update(
    id,
    {
      ...formToPayload(data),
      tg_cap_nhat: new Date().toISOString(),
    },
    { returningSelect: PBXH_THUC_HIEN_RETURNING },
  );
  return flattenThucHienPhanBienRow(updated as unknown as Record<string, unknown>);
}

export async function deleteThucHienPhanBienMany(ids: string[]): Promise<void> {
  await repo.remove(ids);
}

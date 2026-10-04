import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { docNhanVienEmbed, tenNguoiThaoTac } from '@/lib/nguoi-thao-tac';
import { donViGioiThieuToPayload } from '../../don-vi-cuu-tro/utils/don-vi-gioi-thieu';
import { DOT_LOAI_DEFAULT, DOT_LOAI_VALUES, DOT_TRANG_THAI_DANG_TRIEN_KHAI, type DotLoai } from '../core/constants';
import type { KhoDotCuuTroDetail, KhoDotCuuTroListRow } from '../core/types';
import type { KhoDotCuuTroFormValues } from '../core/schema';
import {
  KHO_DOT_CUU_TRO_RETURNING_LIST,
  KHO_DOT_CUU_TRO_SELECT_FULL,
  KHO_DOT_CUU_TRO_SELECT_LIST,
} from '../core/supabase-select';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'kho_dot_cuu_tro',
  select: KHO_DOT_CUU_TRO_SELECT_LIST,
});

function nullableStr(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

function pickTen(v: unknown): string | null {
  const o = Array.isArray(v) ? v[0] : v;
  if (!o || typeof o !== 'object') return null;
  return nullableStr((o as { ten?: unknown }).ten);
}

export function flattenKhoDotCuuTroListRow(row: Record<string, unknown>): KhoDotCuuTroListRow {
  const r = row as Record<string, unknown>;
  const dvLoai = r.don_vi_chu_tri_loai === 'xa_phuong' ? 'xa_phuong' : 'tinh';
  const tenXa = pickTen(r.don_vi_chu_tri);
  return {
    id: String(r.id ?? ''),
    tt: Number(r.tt ?? 0),
    ten: String(r.ten ?? ''),
    loai: (DOT_LOAI_VALUES as readonly string[]).includes(String(r.loai)) ? (r.loai as DotLoai) : DOT_LOAI_DEFAULT,
    don_vi_chu_tri_loai: dvLoai,
    don_vi_chu_tri_id: nullableStr(r.don_vi_chu_tri_id),
    don_vi_chu_tri_label: dvLoai === 'xa_phuong' ? (tenXa ?? '') : txt('matTranDonViCuuTro.tinhCap'),
    tu_ngay: nullableStr(r.tu_ngay),
    den_ngay: nullableStr(r.den_ngay),
    tai_khoan_tiep_nhan: nullableStr(r.tai_khoan_tiep_nhan),
    ngan_hang: nullableStr(r.ngan_hang),
    trang_thai:
      r.trang_thai === 'Kết thúc' ? 'Kết thúc' : DOT_TRANG_THAI_DANG_TRIEN_KHAI,
    ngay_cap_nhat_trang_thai: String(r.ngay_cap_nhat_trang_thai ?? ''),
    tien_do: nullableStr(r.tien_do),
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
    ten_nguoi_tao: tenNguoiThaoTac(docNhanVienEmbed(r.nguoi_tao)),
    ten_nguoi_cap_nhat: tenNguoiThaoTac(docNhanVienEmbed(r.nguoi_cap_nhat)),
  };
}

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t === '' ? null : t;
}

function formToPayload(data: KhoDotCuuTroFormValues): Record<string, unknown> {
  const dv = donViGioiThieuToPayload(data.don_vi_chu_tri);
  return {
    ten: data.ten.trim(),
    loai: data.loai,
    don_vi_chu_tri_loai: dv.don_vi_gioi_thieu_loai,
    don_vi_chu_tri_id: dv.don_vi_gioi_thieu_id,
    tu_ngay: emptyToNull(data.tu_ngay),
    den_ngay: emptyToNull(data.den_ngay),
    tai_khoan_tiep_nhan: emptyToNull(data.tai_khoan_tiep_nhan),
    ngan_hang: emptyToNull(data.ngan_hang),
    trang_thai: data.trang_thai,
    tien_do: emptyToNull(data.tien_do),
    mo_ta: emptyToNull(data.mo_ta),
    link: emptyToNull(data.link),
  };
}

export async function getKhoDotCuuTroList(): Promise<KhoDotCuuTroListRow[]> {
  const list = await repo.getAll({ orderBy: 'tt', ascending: true });
  return list.map((row) => flattenKhoDotCuuTroListRow(row as unknown as Record<string, unknown>));
}

export async function getKhoDotCuuTroById(id: string): Promise<KhoDotCuuTroDetail | null> {
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
  const inserted = await repo.insert(payload as unknown as Omit<RepoRow, 'id'>, {
    returningSelect: KHO_DOT_CUU_TRO_RETURNING_LIST,
  });
  return flattenKhoDotCuuTroListRow(inserted as unknown as Record<string, unknown>);
}

export async function updateKhoDotCuuTro(id: string, data: KhoDotCuuTroFormValues): Promise<KhoDotCuuTroListRow> {
  const payload = formToPayload(data);
  const updated = await repo.update(id, payload as unknown as Partial<RepoRow>, {
    returningSelect: KHO_DOT_CUU_TRO_RETURNING_LIST,
  });
  return flattenKhoDotCuuTroListRow(updated as unknown as Record<string, unknown>);
}

export async function deleteKhoDotCuuTroMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await repo.remove(ids);
}

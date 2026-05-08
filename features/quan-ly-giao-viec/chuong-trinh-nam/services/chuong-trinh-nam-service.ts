import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { ChuongTrinhNam, ChuongTrinhNamListRow } from '../core/types';
import type { ChuongTrinhNamFormValues } from '../core/schema';
import {
  CHUONG_TRINH_NAM_RETURNING_FULL,
  CHUONG_TRINH_NAM_SELECT_FULL,
  CHUONG_TRINH_NAM_SELECT_LIST,
} from '../core/supabase-select';
import { CHUONG_TRINH_NAM_MOCK } from '../mock-data';
import type { ChuongTrinhNamTrangThai } from '../core/constants';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'chuong_trinh_nam',
  select: CHUONG_TRINH_NAM_SELECT_LIST,
  mockData: CHUONG_TRINH_NAM_MOCK as unknown as RepoRow[],
  delay: 400,
});

function pickEmbedded<T extends Record<string, unknown>>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? undefined;
  return v as T;
}

function dateOnly(v: unknown): string {
  if (v == null || v === '') return '';
  const s = typeof v === 'string' ? v.slice(0, 10) : String(v).slice(0, 10);
  return s || '';
}

function nullableStr(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

function normFk(v: string | null | undefined): number | null {
  const s = v == null || v === '' ? '' : String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function flattenChuongTrinhNamRow(row: Record<string, unknown>): ChuongTrinhNam {
  const pb = pickEmbedded<{ ten_phong_ban?: string }>(row.phong_ban);
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const rest = { ...row };
  delete rest.phong_ban;
  delete rest.nguoi_tao;
  const r = rest as Record<string, unknown>;
  return {
    id: String(r.id ?? ''),
    ten_chuong_trinh: String(r.ten_chuong_trinh ?? ''),
    mo_ta: nullableStr(r.mo_ta),
    ghi_chu: nullableStr(r.ghi_chu),
    ngay_bat_dau: dateOnly(r.ngay_bat_dau),
    ngay_ket_thuc: dateOnly(r.ngay_ket_thuc),
    trang_thai: r.trang_thai as ChuongTrinhNamTrangThai,
    id_phong_ban: r.id_phong_ban == null || r.id_phong_ban === '' ? null : String(r.id_phong_ban),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ten_phong_ban: pb?.ten_phong_ban ?? null,
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
  };
}

export function chuongTrinhNamToListRow(row: ChuongTrinhNam): ChuongTrinhNamListRow {
  const { mo_ta: _omitMo, ghi_chu: _omitGhi, ...list } = row;
  return list;
}

function normalize(row: ChuongTrinhNam): ChuongTrinhNam {
  return {
    ...row,
    id: String(row.id),
    id_phong_ban: row.id_phong_ban == null || row.id_phong_ban === '' ? null : String(row.id_phong_ban),
    id_nguoi_tao: String(row.id_nguoi_tao),
  };
}

function formToPayload(data: ChuongTrinhNamFormValues, idNguoiTao?: string) {
  const idPb = normFk(data.id_phong_ban);
  const base = {
    ten_chuong_trinh: data.ten_chuong_trinh.trim(),
    mo_ta: data.mo_ta?.trim() ?? null,
    ghi_chu: data.ghi_chu?.trim() ?? null,
    ngay_bat_dau: data.ngay_bat_dau.slice(0, 10),
    ngay_ket_thuc: data.ngay_ket_thuc.slice(0, 10),
    trang_thai: data.trang_thai,
    id_phong_ban: idPb,
  };
  if (idNguoiTao !== undefined) {
    const n = Number(String(idNguoiTao).trim());
    if (!Number.isFinite(n)) throw new Error(txt('chuongTrinhNam.service.noEmployeeProfile'));
    return { ...base, id_nguoi_tao: n };
  }
  return base;
}

export async function getChuongTrinhNamList(): Promise<ChuongTrinhNamListRow[]> {
  const list = await repo.getAll({ orderBy: 'ngay_bat_dau', ascending: false });
  return list.map((row) => chuongTrinhNamToListRow(normalize(flattenChuongTrinhNamRow(row as unknown as Record<string, unknown>))));
}

export async function getChuongTrinhNamById(id: string): Promise<ChuongTrinhNam | null> {
  if (!isSupabase()) {
    const row = await repo.getById(id);
    if (!row) return null;
    return normalize(flattenChuongTrinhNamRow(row as unknown as Record<string, unknown>));
  }
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('chuong_trinh_nam')
    .select(CHUONG_TRINH_NAM_SELECT_FULL)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return normalize(flattenChuongTrinhNamRow(data as unknown as Record<string, unknown>));
}

export async function createChuongTrinhNam(
  data: ChuongTrinhNamFormValues,
  idNguoiTao: string,
): Promise<ChuongTrinhNam> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('chuongTrinhNam.service.noEmployeeProfile'));
  const payload = formToPayload(data, trimmed);
  const inserted = await repo.insert(payload as unknown as Omit<ChuongTrinhNam, 'id'>, {
    returningSelect: CHUONG_TRINH_NAM_RETURNING_FULL,
  });
  return normalize(flattenChuongTrinhNamRow(inserted as unknown as Record<string, unknown>));
}

export async function updateChuongTrinhNam(id: string, data: ChuongTrinhNamFormValues): Promise<ChuongTrinhNam> {
  const payload = formToPayload(data);
  const updated = await repo.update(id, payload as unknown as Partial<ChuongTrinhNam>, {
    returningSelect: CHUONG_TRINH_NAM_RETURNING_FULL,
  });
  return normalize(flattenChuongTrinhNamRow(updated as unknown as Record<string, unknown>));
}

export async function deleteChuongTrinhNamMany(ids: string[]): Promise<void> {
  await repo.remove(ids);
}

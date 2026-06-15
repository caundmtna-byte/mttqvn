import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { fetchAllPages } from '@/lib/supabase/fetch-all-pages';
import type {
  KhoTonKhoRow,
  NhapXuatKhoCtFlatRow,
  NhapXuatKhoCtRow,
  NhapXuatKhoDetail,
  NhapXuatKhoListRow,
} from '../core/types';
import type { NhapXuatKhoLoaiPhieu } from '../core/constants';
import type { NhapXuatKhoFormValues } from '../core/schema';
import {
  NHAP_XUAT_KHO_CT_SELECT_FLAT_LIST,
  NHAP_XUAT_KHO_SELECT_FULL,
  NHAP_XUAT_KHO_SELECT_LIST,
} from '../core/supabase-select';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickEmbedded<T extends Record<string, unknown>>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? undefined;
  return v as T;
}

function dateOnly(v: unknown): string {
  if (v == null || v === '') return '';
  return typeof v === 'string' ? v.slice(0, 10) : String(v).slice(0, 10);
}

function nullableStr(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

function toNumber(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toNullableId(v: string | null | undefined): number | null {
  if (v == null) return null;
  const t = String(v).trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function isPersistedId(id: unknown): id is string {
  if (id == null || typeof id !== 'string') return false;
  return /^\d+$/.test(id.trim());
}

function countFromCtAggregate(raw: unknown): number {
  if (!Array.isArray(raw)) return 0;
  if (raw.length === 1 && raw[0] != null && typeof raw[0] === 'object' && 'count' in (raw[0] as object)) {
    const c = (raw[0] as Record<string, unknown>).count;
    return typeof c === 'number' ? c : typeof c === 'string' && /^\d+$/.test(c) ? Number(c) : 0;
  }
  return raw.length;
}

function nameFromEmbed(v: unknown, key: 'ten_kho' | 'ten' | 'ten_hang_hoa'): string | null {
  const o = pickEmbedded<Record<string, unknown>>(v);
  if (!o) return null;
  const t = o[key];
  return t != null && String(t).trim() !== '' ? String(t) : null;
}

function donViIdFromKhoEmbed(v: unknown): string | null {
  const o = pickEmbedded<Record<string, unknown>>(v);
  if (!o) return null;
  return nullableStr(o.don_vi_id);
}

// ---------------------------------------------------------------------------
// Flatten helpers
// ---------------------------------------------------------------------------

export function flattenListRow(row: Record<string, unknown>): NhapXuatKhoListRow {
  return {
    id: String(row.id ?? ''),
    tt: toNumber(row.tt),
    so_phieu: String(row.so_phieu ?? ''),
    loai_phieu: String(row.loai_phieu ?? 'nhap_ngoai') as NhapXuatKhoLoaiPhieu,
    ngay_phieu: dateOnly(row.ngay_phieu),
    kho_xuat_id: nullableStr(row.kho_xuat_id),
    ten_kho_xuat: nameFromEmbed(row.kho_xuat, 'ten_kho'),
    kho_xuat_don_vi_id: donViIdFromKhoEmbed(row.kho_xuat),
    kho_nhap_id: nullableStr(row.kho_nhap_id),
    ten_kho_nhap: nameFromEmbed(row.kho_nhap, 'ten_kho'),
    kho_nhap_don_vi_id: donViIdFromKhoEmbed(row.kho_nhap),
    don_vi_cuu_tro_id: nullableStr(row.don_vi_cuu_tro_id),
    ten_don_vi_cuu_tro: nameFromEmbed(row.don_vi, 'ten'),
    dot_cuu_tro_id: nullableStr(row.dot_cuu_tro_id),
    ten_dot_cuu_tro: nameFromEmbed(row.dot, 'ten'),
    so_dong: countFromCtAggregate(row.kho_nhap_xuat_kho_ct),
    tg_tao: String(row.tg_tao ?? ''),
    tg_cap_nhat: String(row.tg_cap_nhat ?? ''),
  };
}

function flattenCtRow(row: Record<string, unknown>): NhapXuatKhoCtRow {
  return {
    id: String(row.id ?? ''),
    phieu_id: String(row.phieu_id ?? ''),
    hang_hoa_id: String(row.hang_hoa_id ?? ''),
    ten_hang_hoa: nameFromEmbed(row.hang_hoa, 'ten_hang_hoa'),
    don_vi_tinh: String(row.don_vi_tinh ?? ''),
    so_luong: toNumber(row.so_luong),
    don_gia: toNumber(row.don_gia),
    thanh_tien: toNumber(row.thanh_tien),
    ghi_chu: nullableStr(row.ghi_chu),
    thu_tu: toNumber(row.thu_tu),
  };
}

export function flattenFullRow(row: Record<string, unknown>): NhapXuatKhoDetail {
  const base = flattenListRow(row);
  const rawCt = row.kho_nhap_xuat_kho_ct;
  const chi_tiet: NhapXuatKhoCtRow[] = Array.isArray(rawCt)
    ? rawCt
        .filter((x) => x != null && typeof x === 'object' && !('count' in (x as object) && Object.keys(x as object).length === 1))
        .map((x) => flattenCtRow(x as Record<string, unknown>))
        .sort((a, b) => a.thu_tu - b.thu_tu || Number(a.id) - Number(b.id))
    : [];

  return {
    ...base,
    so_dong: chi_tiet.length,
    ghi_chu: nullableStr(row.ghi_chu),
    nguoi_giao_nhan: nullableStr(row.nguoi_giao_nhan),
    bo_phan: nullableStr(row.bo_phan),
    chung_tu_goc: nullableStr(row.chung_tu_goc),
    chi_tiet,
  };
}

export function flattenCtFlatRow(row: Record<string, unknown>): NhapXuatKhoCtFlatRow {
  const phieu = pickEmbedded<Record<string, unknown>>(row.phieu);
  return {
    id: String(row.id ?? ''),
    phieu_id: String(row.phieu_id ?? phieu?.id ?? ''),
    so_phieu: String(phieu?.so_phieu ?? ''),
    loai_phieu: String(phieu?.loai_phieu ?? 'nhap_ngoai') as NhapXuatKhoLoaiPhieu,
    ngay_phieu: dateOnly(phieu?.ngay_phieu),
    kho_xuat_id: nullableStr(phieu?.kho_xuat_id),
    ten_kho_xuat: nameFromEmbed(phieu?.kho_xuat, 'ten_kho'),
    kho_xuat_don_vi_id: donViIdFromKhoEmbed(phieu?.kho_xuat),
    kho_nhap_id: nullableStr(phieu?.kho_nhap_id),
    ten_kho_nhap: nameFromEmbed(phieu?.kho_nhap, 'ten_kho'),
    kho_nhap_don_vi_id: donViIdFromKhoEmbed(phieu?.kho_nhap),
    don_vi_cuu_tro_id: nullableStr(phieu?.don_vi_cuu_tro_id),
    ten_don_vi_cuu_tro: nameFromEmbed(phieu?.don_vi, 'ten'),
    dot_cuu_tro_id: nullableStr(phieu?.dot_cuu_tro_id),
    ten_dot_cuu_tro: nameFromEmbed(phieu?.dot, 'ten'),
    hang_hoa_id: String(row.hang_hoa_id ?? ''),
    ten_hang_hoa: nameFromEmbed(row.hang_hoa, 'ten_hang_hoa'),
    don_vi_tinh: String(row.don_vi_tinh ?? ''),
    so_luong: toNumber(row.so_luong),
    don_gia: toNumber(row.don_gia),
    thanh_tien: toNumber(row.thanh_tien),
    ghi_chu: nullableStr(row.ghi_chu),
  };
}

// ---------------------------------------------------------------------------
// Error mapping (PG `RAISE EXCEPTION 'TON_KHO_KHONG_DU: ...'` → toast)
// ---------------------------------------------------------------------------

function rethrowMapped(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  if (/TON_KHO_KHONG_DU/i.test(message)) {
    const tail = message.replace(/^.*TON_KHO_KHONG_DU:\s*/i, '').trim();
    throw new Error(tail || txt('matTranNhapXuatKho.service.tonKhoKhongDu'));
  }
  if (/CHI_TIET_RONG/i.test(message)) {
    throw new Error(txt('matTranNhapXuatKho.service.chiTietRong'));
  }
  if (/PHIEU_KHONG_TON_TAI/i.test(message)) {
    throw new Error(txt('matTranNhapXuatKho.service.notFound'));
  }
  throw err instanceof Error ? err : new Error(message);
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export async function getNhapXuatKhoList(): Promise<NhapXuatKhoListRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const data = await fetchAllPages<Record<string, unknown>>(async (from, to) => {
    const { data: rows, error } = await supabase
      .from('kho_nhap_xuat_kho')
      .select(NHAP_XUAT_KHO_SELECT_LIST)
      .order('ngay_phieu', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to);
    if (error) handleSupabaseError(error);
    return (rows ?? []) as Record<string, unknown>[];
  });
  return data.map((row) => flattenListRow(row));
}

export async function getNhapXuatKhoById(id: string): Promise<NhapXuatKhoDetail | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('kho_nhap_xuat_kho')
    .select(NHAP_XUAT_KHO_SELECT_FULL)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenFullRow(data as unknown as Record<string, unknown>);
}

export async function getNhapXuatKhoCtFlatList(): Promise<NhapXuatKhoCtFlatRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const data = await fetchAllPages<Record<string, unknown>>(async (from, to) => {
    const { data: rows, error } = await supabase
      .from('kho_nhap_xuat_kho_ct')
      .select(NHAP_XUAT_KHO_CT_SELECT_FLAT_LIST)
      .order('id', { ascending: false })
      .range(from, to);
    if (error) handleSupabaseError(error);
    return (rows ?? []) as Record<string, unknown>[];
  });
  return data.map((row) => flattenCtFlatRow(row));
}

/** Đơn giá gần nhất theo hang_hoa_id — lấy từ lần nhập gần nhất (ngay_phieu DESC). */
export async function getLastDonGiaMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  const supabase = getSupabase();
  if (!supabase) return map;

  const data = await fetchAllPages<Record<string, unknown>>(async (from, to) => {
    const { data: rows, error } = await supabase
      .from('kho_nhap_xuat_kho_ct')
      .select('hang_hoa_id,don_gia,phieu:kho_nhap_xuat_kho!inner(ngay_phieu)')
      .order('ngay_phieu', { ascending: false, referencedTable: 'phieu' })
      .range(from, to);
    if (error) handleSupabaseError(error);
    return (rows ?? []) as Record<string, unknown>[];
  });

  for (const row of data) {
    const r = row;
    const hangHoaId = String(r.hang_hoa_id ?? '');
    if (!hangHoaId || map.has(hangHoaId)) continue;
    const donGia = toNumber(r.don_gia);
    if (donGia > 0) map.set(hangHoaId, donGia);
  }

  return map;
}

export async function getKhoTonKhoByKho(khoId: string | null): Promise<KhoTonKhoRow[]> {
  const id = (khoId ?? '').trim();
  if (!id) return [];
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('kho_ton_kho_view')
    .select('kho_id,hang_hoa_id,ton_kho')
    .eq('kho_id', id);
  if (error) handleSupabaseError(error);
  return (data ?? []).map((row) => ({
    kho_id: String((row as Record<string, unknown>).kho_id ?? ''),
    hang_hoa_id: String((row as Record<string, unknown>).hang_hoa_id ?? ''),
    ton_kho: toNumber((row as Record<string, unknown>).ton_kho),
  }));
}

function buildChiTietPayload(data: NhapXuatKhoFormValues) {
  return data.chi_tiet.map((line, i) => ({
    hang_hoa_id: Number(line.hang_hoa_id),
    don_vi_tinh: line.don_vi_tinh.trim(),
    so_luong: Number(line.so_luong),
    don_gia: line.don_gia.trim() === '' ? 0 : Number(line.don_gia),
    ghi_chu: line.ghi_chu?.trim() ?? '',
    thu_tu: i + 1,
  }));
}

export async function createNhapXuatKho(data: NhapXuatKhoFormValues): Promise<NhapXuatKhoDetail> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase chưa được cấu hình. Đặt VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong .env.local (xem .env.example).');
  try {
    const { data: rpcData, error } = await supabase.rpc('rpc_kho_tao_phieu_nhap_xuat', {
      p_loai_phieu: data.loai_phieu,
      p_ngay_phieu: data.ngay_phieu,
      p_kho_xuat_id: toNullableId(data.kho_xuat_id),
      p_kho_nhap_id: toNullableId(data.kho_nhap_id),
      p_don_vi_cuu_tro_id: toNullableId(data.don_vi_cuu_tro_id),
      p_dot_cuu_tro_id: toNullableId(data.dot_cuu_tro_id),
      p_ghi_chu: data.ghi_chu?.trim() ?? null,
      p_nguoi_giao_nhan: data.nguoi_giao_nhan?.trim() ?? null,
      p_bo_phan: data.bo_phan?.trim() ?? null,
      p_chung_tu_goc: data.chung_tu_goc?.trim() ?? null,
      p_chi_tiet: buildChiTietPayload(data),
    });
    if (error) handleSupabaseError(error);
    const newId = String(rpcData ?? '');
    const full = await getNhapXuatKhoById(newId);
    if (!full) throw new Error(txt('matTranNhapXuatKho.service.notFound'));
    return full;
  } catch (err) {
    rethrowMapped(err);
  }
}

export async function updateNhapXuatKho(
  id: string,
  data: NhapXuatKhoFormValues,
): Promise<NhapXuatKhoDetail> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase chưa được cấu hình. Đặt VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong .env.local (xem .env.example).');
  try {
    const { error } = await supabase.rpc('rpc_kho_cap_nhat_phieu_nhap_xuat', {
      p_id: Number(id),
      p_loai_phieu: data.loai_phieu,
      p_ngay_phieu: data.ngay_phieu,
      p_kho_xuat_id: toNullableId(data.kho_xuat_id),
      p_kho_nhap_id: toNullableId(data.kho_nhap_id),
      p_don_vi_cuu_tro_id: toNullableId(data.don_vi_cuu_tro_id),
      p_dot_cuu_tro_id: toNullableId(data.dot_cuu_tro_id),
      p_ghi_chu: data.ghi_chu?.trim() ?? null,
      p_nguoi_giao_nhan: data.nguoi_giao_nhan?.trim() ?? null,
      p_bo_phan: data.bo_phan?.trim() ?? null,
      p_chung_tu_goc: data.chung_tu_goc?.trim() ?? null,
      p_chi_tiet: buildChiTietPayload(data),
    });
    if (error) handleSupabaseError(error);
    const full = await getNhapXuatKhoById(id);
    if (!full) throw new Error(txt('matTranNhapXuatKho.service.notFound'));
    return full;
  } catch (err) {
    rethrowMapped(err);
  }
}

export async function deleteNhapXuatKhoMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase chưa được cấu hình. Đặt VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong .env.local (xem .env.example).');
  const numericIds = ids.filter((x) => isPersistedId(x)).map((x) => Number(x));
  const { error } = await supabase.from('kho_nhap_xuat_kho').delete().in('id', numericIds);
  if (error) handleSupabaseError(error);
}

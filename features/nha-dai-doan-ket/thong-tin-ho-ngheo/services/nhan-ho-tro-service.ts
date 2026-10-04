import { buildRpcSortParam, fetchAllServerPages, readRpcTotalCount, type ServerSortState } from '@/lib/data/server-paging';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { HnghNhanHoTroRow, HnghNhanHoTroTong, HnghPhieuXuatKho } from '../core/nhan-ho-tro';

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const strOrNull = (v: unknown) => {
  const s = v == null ? '' : String(v).trim();
  return s === '' ? null : s;
};

function rowFromRpc(r: Record<string, unknown>): HnghNhanHoTroRow {
  return {
    id: String(r.id ?? ''),
    ho_ten_dai_dien: String(r.ho_ten_dai_dien ?? ''),
    so_cccd: strOrNull(r.so_cccd),
    xa_phuong_id: strOrNull(r.xa_phuong_id),
    ten_xa_phuong: strOrNull(r.ten_xa_phuong),
    khoi_xom: strOrNull(r.khoi_xom),
    doi_tuong: strOrNull(r.doi_tuong),
    vnn_tien: num(r.vnn_tien),
    vnn_hien_vat: num(r.vnn_hien_vat),
    vnn_so_khoan: num(r.vnn_so_khoan),
    nddk_tien: num(r.nddk_tien),
    nddk_so_can: num(r.nddk_so_can),
    kho_gia_tri: num(r.kho_gia_tri),
    kho_so_phieu: num(r.kho_so_phieu),
    tong_gia_tri: num(r.tong_gia_tri),
  };
}

/** Cột được RPC sắp xếp — phải khớp ORDER BY của `get_hngh_nhan_ho_tro_page`. */
export const HNGH_NHAN_HO_TRO_SORT_COLUMNS = [
  'ho_ten_dai_dien',
  'ten_xa_phuong',
  'vnn_tong',
  'nddk_tien',
  'kho_gia_tri',
  'tong_gia_tri',
] as const;

export type HnghNhanHoTroQuery = {
  page: number;
  pageSize: number;
  search: string;
  sort?: ServerSortState | null;
  nam: readonly string[];
  xaPhuongIds: readonly string[];
  doiTuong: readonly string[];
  chiHoDaNhan: boolean;
};

const intArr = (l: readonly string[]) => {
  const out = l.map((x) => Number.parseInt(x, 10)).filter((n) => Number.isFinite(n));
  return out.length > 0 ? out : null;
};
const textArr = (l: readonly string[]) => (l.length > 0 ? [...l] : null);

/** Phạm vi xem (xã chỉ thấy hộ của xã mình) do máy chủ tự tính — client không gửi. */
export async function getHnghNhanHoTroPage(
  q: HnghNhanHoTroQuery,
): Promise<{ rows: HnghNhanHoTroRow[]; hasNextPage: boolean; totalRecords: number }> {
  const supabase = getSupabase();
  if (!supabase) return { rows: [], hasNextPage: false, totalRecords: 0 };
  const pageSize = Math.max(1, Math.min(Math.floor(q.pageSize), 500));
  const page = Math.max(1, Math.floor(q.page));
  const offset = (page - 1) * pageSize;
  const { data, error } = await supabase.rpc('get_hngh_nhan_ho_tro_page', {
    p_search: q.search?.trim() || null,
    p_limit: pageSize,
    p_offset: offset,
    p_sort: buildRpcSortParam(q.sort, HNGH_NHAN_HO_TRO_SORT_COLUMNS),
    p_nam: intArr(q.nam),
    p_xa_phuong_ids: intArr(q.xaPhuongIds),
    p_doi_tuong: textArr(q.doiTuong),
    p_chi_ho_da_nhan: q.chiHoDaNhan,
  } as never);
  if (error) handleSupabaseError(error);
  const raw = (data ?? []) as unknown as Record<string, unknown>[];
  const rows = raw.map(rowFromRpc);
  const totalRecords =
    readRpcTotalCount(raw) ?? (offset > 0 ? (await getHnghNhanHoTroPage({ ...q, page: 1, pageSize: 1 })).totalRecords : 0);
  return { rows, hasNextPage: offset + rows.length < totalRecords, totalRecords };
}

export function getHnghNhanHoTroAllForExport(q: Omit<HnghNhanHoTroQuery, 'page' | 'pageSize'>) {
  return fetchAllServerPages(q, getHnghNhanHoTroPage);
}

export async function getHnghNhanHoTroTong(
  q: Pick<HnghNhanHoTroQuery, 'search' | 'nam' | 'xaPhuongIds' | 'doiTuong'>,
): Promise<HnghNhanHoTroTong> {
  const empty: HnghNhanHoTroTong = { so_ho: 0, so_ho_da_nhan: 0, vnn_tien: 0, vnn_hien_vat: 0, nddk_tien: 0, kho_gia_tri: 0, tong_gia_tri: 0 };
  const supabase = getSupabase();
  if (!supabase) return empty;
  const { data, error } = await supabase.rpc('get_hngh_nhan_ho_tro_tong', {
    p_search: q.search?.trim() || null,
    p_nam: intArr(q.nam),
    p_xa_phuong_ids: intArr(q.xaPhuongIds),
    p_doi_tuong: textArr(q.doiTuong),
  } as never);
  if (error) handleSupabaseError(error);
  const r = ((data ?? []) as unknown as Record<string, unknown>[])[0];
  if (!r) return empty;
  return {
    so_ho: num(r.so_ho),
    so_ho_da_nhan: num(r.so_ho_da_nhan),
    vnn_tien: num(r.vnn_tien),
    vnn_hien_vat: num(r.vnn_hien_vat),
    nddk_tien: num(r.nddk_tien),
    kho_gia_tri: num(r.kho_gia_tri),
    tong_gia_tri: num(r.tong_gia_tri),
  };
}

/** Số đã nhận của một hộ (mọi năm) + phiếu xuất kho gắn hộ — màn chi tiết hộ. */
export async function getNhanHoTroCuaHo(
  hoNgheoId: string,
): Promise<{ tong: HnghNhanHoTroRow | null; phieuKho: HnghPhieuXuatKho[] }> {
  const supabase = getSupabase();
  if (!supabase || !hoNgheoId) return { tong: null, phieuKho: [] };
  const [{ data: tongData, error: e1 }, { data: phieuData, error: e2 }] = await Promise.all([
    supabase.rpc('get_hngh_nhan_ho_tro_page', {
      p_ho_ngheo_id: Number(hoNgheoId),
      p_chi_ho_da_nhan: false,
      p_limit: 1,
    } as never),
    supabase
      .from('kho_nhap_xuat_kho')
      .select(
        'id,so_phieu,ngay_phieu,kho_xuat:kho_danh_sach_kho!kho_nhap_xuat_kho_kho_xuat_id_fkey(ten_kho),dot:kho_dot_cuu_tro!kho_nhap_xuat_kho_dot_cuu_tro_id_fkey(ten),kho_nhap_xuat_kho_ct(thanh_tien)',
      )
      .eq('loai_phieu', 'xuat_ngoai')
      .eq('ho_ngheo_id', hoNgheoId)
      .order('ngay_phieu', { ascending: false }),
  ]);
  if (e1) handleSupabaseError(e1);
  if (e2) handleSupabaseError(e2);
  const tongRaw = ((tongData ?? []) as unknown as Record<string, unknown>[])[0];
  const ten = (v: unknown, key: string) => {
    const o = Array.isArray(v) ? v[0] : v;
    return o && typeof o === 'object' ? strOrNull((o as Record<string, unknown>)[key]) : null;
  };
  const phieuKho = ((phieuData ?? []) as unknown as Record<string, unknown>[]).map((p) => ({
    id: String(p.id),
    so_phieu: String(p.so_phieu ?? ''),
    ngay_phieu: String(p.ngay_phieu ?? ''),
    ten_kho_xuat: ten(p.kho_xuat, 'ten_kho'),
    ten_chuong_trinh: ten(p.dot, 'ten'),
    tong_tien: (Array.isArray(p.kho_nhap_xuat_kho_ct) ? (p.kho_nhap_xuat_kho_ct as Record<string, unknown>[]) : []).reduce(
      (s, ct) => s + num(ct.thanh_tien),
      0,
    ),
  }));
  return { tong: tongRaw ? rowFromRpc(tongRaw) : null, phieuKho };
}

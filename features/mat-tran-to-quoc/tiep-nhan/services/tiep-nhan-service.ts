import {
  buildRpcSortParam,
  fetchAllServerPages,
  readRpcTotalCount,
  type ServerSortState,
} from '@/lib/data/server-paging';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { TN_HINH_THUC_VALUES, TN_MUC_DICH_VALUES, TN_TRANG_THAI_DEFAULT, type TnHinhThuc, type TnMucDich, type TnTrangThai } from '../core/constants';
import type { TiepNhan, TiepNhanFull, TnPhieuKho, TnPhuLucDong } from '../core/types';
import { tiepNhanToRpcData, type TiepNhanFormValues, type TiepNhanTrangThaiValues } from '../core/schema';

const TABLE = 'tn_tiep_nhan';

function str(v: unknown): string {
  return v == null ? '' : String(v);
}
function strOrNull(v: unknown): string | null {
  const s = v == null ? '' : String(v).trim();
  return s === '' ? null : s;
}
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Dòng phẳng của RPC `get_tn_tiep_nhan_page` → `TiepNhan`. */
export function rpcRowToTiepNhan(r: Record<string, unknown>): TiepNhan {
  const hinhThuc = str(r.hinh_thuc);
  return {
    id: str(r.id),
    so_phieu: str(r.so_phieu),
    ngay_tiep_nhan: str(r.ngay_tiep_nhan).slice(0, 10),
    nha_tai_tro_id: str(r.nha_tai_tro_id),
    ten_nha_tai_tro: str(r.ten_nha_tai_tro),
    loai_nha_tai_tro: strOrNull(r.loai_nha_tai_tro),
    chuong_trinh_id: str(r.chuong_trinh_id),
    ten_chuong_trinh: str(r.ten_chuong_trinh),
    don_vi_chu_tri_loai: r.don_vi_chu_tri_loai === 'xa_phuong' ? 'xa_phuong' : 'tinh',
    don_vi_chu_tri_id: strOrNull(r.don_vi_chu_tri_id),
    ten_don_vi_tiep_nhan: str(r.ten_don_vi_tiep_nhan),
    hinh_thuc: (TN_HINH_THUC_VALUES as readonly string[]).includes(hinhThuc) ? (hinhThuc as TnHinhThuc) : null,
    so_tien: num(r.so_tien),
    giay_to_co_gia_gia_tri: numOrNull(r.giay_to_co_gia_gia_tri),
    hien_vat_khac_gia_tri: numOrNull(r.hien_vat_khac_gia_tri),
    gia_tri_phieu_kho: num(r.gia_tri_phieu_kho),
    so_phieu_kho: num(r.so_phieu_kho),
    tong_gia_tri: num(r.tong_gia_tri),
    trang_thai: (str(r.trang_thai) || TN_TRANG_THAI_DEFAULT) as TnTrangThai,
    ngay_cap_nhat_trang_thai: str(r.ngay_cap_nhat_trang_thai),
    ghi_chu: strOrNull(r.ghi_chu),
    ho_va_ten_nguoi_tao: strOrNull(r.ho_va_ten_nguoi_tao),
    ten_tai_khoan_nguoi_tao: strOrNull(r.ten_tai_khoan_nguoi_tao),
    ho_va_ten_nguoi_cap_nhat: strOrNull(r.ho_va_ten_nguoi_cap_nhat),
    ten_tai_khoan_nguoi_cap_nhat: strOrNull(r.ten_tai_khoan_nguoi_cap_nhat),
    tg_tao: str(r.tg_tao),
    tg_cap_nhat: str(r.tg_cap_nhat),
  };
}

function rpcRowToPhieuKho(r: Record<string, unknown>): TnPhieuKho {
  return {
    phieu_id: str(r.phieu_id),
    so_phieu: str(r.so_phieu),
    ngay_phieu: str(r.ngay_phieu).slice(0, 10),
    ten_kho: strOrNull(r.ten_kho),
    ten_chuong_trinh: strOrNull(r.ten_chuong_trinh),
    tong_tien: num(r.tong_tien),
    so_dong: num(r.so_dong),
    tiep_nhan_id: strOrNull(r.tiep_nhan_id),
    so_phieu_tiep_nhan: strOrNull(r.so_phieu_tiep_nhan),
  };
}

function docPhuLuc(v: unknown): TnPhuLucDong[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((d): d is Record<string, unknown> => d != null && typeof d === 'object')
    .map((d) => ({
      ho_ten: str(d.ho_ten),
      dia_chi: str(d.dia_chi),
      quan_he: str(d.quan_he),
      noi_dung_gia_tri: str(d.noi_dung_gia_tri),
    }));
}

// ---------------------------------------------------------------------------
// Phân trang phía máy chủ — phạm vi xem tính TẠI MÁY CHỦ (cùng luật policy tn_tiep_nhan_xem)
// ---------------------------------------------------------------------------

/** Cột được RPC sắp xếp — phải khớp khối ORDER BY của `get_tn_tiep_nhan_page`. */
export const TN_SERVER_SORT_COLUMNS = [
  'so_phieu',
  'ngay_tiep_nhan',
  'ten_nha_tai_tro',
  'ten_chuong_trinh',
  'so_tien',
  'tong_gia_tri',
  'trang_thai',
  'tg_cap_nhat',
] as const;

export type TnPageQuery = {
  page: number;
  pageSize: number;
  search: string;
  sort?: ServerSortState | null;
  nhaTaiTroIds: readonly string[];
  chuongTrinhIds: readonly string[];
  hinhThuc: readonly string[];
  trangThai: readonly string[];
};

export type TnPageResult = { rows: TiepNhan[]; hasNextPage: boolean; totalRecords: number };

const idArr = (l: readonly string[]) => {
  const out = l.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  return out.length > 0 ? out : null;
};
const textArr = (l: readonly string[]) => (l.length > 0 ? [...l] : null);

export async function getTiepNhanPage(q: TnPageQuery): Promise<TnPageResult> {
  const supabase = getSupabase();
  if (!supabase) return { rows: [], hasNextPage: false, totalRecords: 0 };
  const pageSize = Math.max(1, Math.min(Math.floor(q.pageSize), 500));
  const page = Math.max(1, Math.floor(q.page));
  const offset = (page - 1) * pageSize;
  const search = q.search?.trim() ?? '';

  const { data, error } = await supabase.rpc('get_tn_tiep_nhan_page', {
    p_search: search || null,
    p_limit: pageSize,
    p_offset: offset,
    p_sort: buildRpcSortParam(q.sort, TN_SERVER_SORT_COLUMNS),
    p_nha_tai_tro_ids: idArr(q.nhaTaiTroIds),
    p_chuong_trinh_ids: idArr(q.chuongTrinhIds),
    p_hinh_thuc: textArr(q.hinhThuc),
    p_trang_thai: textArr(q.trangThai),
  } as never);
  if (error) handleSupabaseError(error);

  const raw = (data ?? []) as unknown as Record<string, unknown>[];
  const rows = raw.map(rpcRowToTiepNhan);
  const totalFromPage = readRpcTotalCount(raw);
  // Trang rỗng ngoài trang 1 không mang được tổng ⇒ hỏi lại trang đầu.
  const totalRecords =
    totalFromPage ?? (offset > 0 ? (await getTiepNhanPage({ ...q, page: 1, pageSize: 1 })).totalRecords : 0);
  return { rows, hasNextPage: offset + rows.length < totalRecords, totalRecords };
}

/** Kéo toàn bộ bản ghi khớp bộ lọc để xuất file (từng lô 500 dòng). */
export function getTiepNhanAllForExport(q: Omit<TnPageQuery, 'page' | 'pageSize'>): Promise<TiepNhan[]> {
  return fetchAllServerPages(q, getTiepNhanPage);
}

/** Phiếu "Nhập từ ngoài" của nhà tài trợ — trong phạm vi kho của người gọi. */
export async function getTnPhieuKhoCuaNhaTaiTro(nhaTaiTroId: string): Promise<TnPhieuKho[]> {
  const supabase = getSupabase();
  if (!supabase || !nhaTaiTroId) return [];
  const { data, error } = await supabase.rpc('get_tn_phieu_kho_cua_nha_tai_tro', {
    p_nha_tai_tro_id: Number(nhaTaiTroId),
  } as never);
  if (error) handleSupabaseError(error);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(rpcRowToPhieuKho);
}

/**
 * Bản đầy đủ của một khoản: dòng RPC (tên, tổng) + cột chi tiết + phiếu kho đã gắn.
 * `null` khi không có hoặc nằm ngoài phạm vi xem (RPC lọc tại máy chủ).
 */
export async function getTiepNhanFull(id: string): Promise<TiepNhanFull | null> {
  const supabase = getSupabase();
  if (!supabase || !id) return null;
  const { data: page, error: e1 } = await supabase.rpc('get_tn_tiep_nhan_page', { p_id: Number(id), p_limit: 1 } as never);
  if (e1) handleSupabaseError(e1);
  const base = ((page ?? []) as unknown as Record<string, unknown>[])[0];
  if (!base) return null;
  const row = rpcRowToTiepNhan(base);

  const [{ data: chiTiet, error: e2 }, phieu] = await Promise.all([
    supabase
      .from(TABLE)
      .select('giay_to_co_gia_mo_ta,hien_vat_khac_mo_ta,muc_dich,dia_diem_lap,phu_luc')
      .eq('id', id)
      .maybeSingle(),
    getTnPhieuKhoCuaNhaTaiTro(row.nha_tai_tro_id),
  ]);
  if (e2) handleSupabaseError(e2);
  const ct = (chiTiet ?? {}) as Record<string, unknown>;
  const mucDich = Array.isArray(ct.muc_dich)
    ? (ct.muc_dich as unknown[]).map(String).filter((m): m is TnMucDich => (TN_MUC_DICH_VALUES as readonly string[]).includes(m))
    : [];
  return {
    ...row,
    giay_to_co_gia_mo_ta: strOrNull(ct.giay_to_co_gia_mo_ta),
    hien_vat_khac_mo_ta: strOrNull(ct.hien_vat_khac_mo_ta),
    muc_dich: mucDich,
    dia_diem_lap: strOrNull(ct.dia_diem_lap),
    phu_luc: docPhuLuc(ct.phu_luc),
    phieu_kho: phieu.filter((p) => p.tiep_nhan_id === row.id),
  };
}

/** Thêm (id null) hoặc sửa — một giao dịch: đầu phiếu + phiếu kho gắn. Trả id. */
export async function luuTiepNhan(id: string | null, v: TiepNhanFormValues): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase chưa sẵn sàng');
  const { data, error } = await supabase.rpc('rpc_tn_luu_tiep_nhan', {
    p_id: id ? Number(id) : null,
    p_data: tiepNhanToRpcData(v),
    p_phieu_ids: v.phieu_ids.map(Number),
  } as never);
  if (error) handleSupabaseError(error);
  return String(data);
}

/** Đổi RIÊNG trạng thái + lý do — `ghi_chu` được trigger chụp vào lich_su_trang_thai. */
export async function updateTiepNhanTrangThai(id: string, v: TiepNhanTrangThaiValues): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from(TABLE)
    .update({ trang_thai: v.trang_thai, ghi_chu: v.ghi_chu || null } as never)
    .eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function deleteTiepNhanMany(ids: string[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || ids.length === 0) return;
  const { error } = await supabase.from(TABLE).delete().in('id', ids);
  if (error) handleSupabaseError(error);
}

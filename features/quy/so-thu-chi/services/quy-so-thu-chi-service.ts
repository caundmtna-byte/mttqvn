import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import {
  buildRpcSortParam,
  fetchAllServerPages,
  readRpcTotalCount,
  type ServerSortState,
} from '@/lib/data/server-paging';
import type { QuyKey, QuyLoai } from '../../core/constants';
import { parseTienInput } from '../../utils/quy-tien';
import type { QuySoThuChiDetail, QuySoThuChiListRow, QuySoThuChiTong } from '../core/types';
import type { QuySoThuChiFormValues } from '../core/schema';
import { QUY_SO_THU_CHI_RETURNING, QUY_SO_THU_CHI_SELECT } from '../core/supabase-select';

const TABLE = 'quy_so_thu_chi';

/**
 * Cột được RPC sắp xếp — phải khớp ĐÚNG khối `ORDER BY ... CASE WHEN p_sort`
 * trong `20260729101000_get_quy_so_thu_chi_page.sql`. Lệch một tên là người dùng
 * bấm sắp xếp mà danh sách không đổi.
 */
export const QUY_SO_THU_CHI_SERVER_SORT_COLUMNS = [
  'so_chung_tu',
  'ngay_chung_tu',
  'loai',
  'ten_khoan',
  'ten_tai_khoan',
  'so_tien',
  'noi_dung',
  'nguoi_nop_nhan',
  'ten_don_vi',
  'ho_va_ten_nguoi_tao',
  'tg_cap_nhat',
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nullableStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/** `numeric` của Postgres về client là chuỗi — cộng chuỗi bằng `+` là nối chuỗi. */
function toNumber(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function dateOnly(v: unknown): string {
  if (v == null || v === '') return '';
  return String(v).slice(0, 10);
}

function pickEmbedded<T extends Record<string, unknown>>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? undefined;
  return v as T;
}

function toNullableId(v: string | null | undefined): number | null {
  if (v == null) return null;
  const t = String(v).trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function toIdArray(ids: readonly string[] | null | undefined): number[] | null {
  if (!ids || ids.length === 0) return null;
  const out = ids.map((x) => Number(String(x).trim())).filter((n) => Number.isFinite(n));
  return out.length > 0 ? out : null;
}

/** Bỏ ô trống để RPC khỏi lọc theo chuỗi rỗng; rỗng hết ⇒ `null`. */
function cleanColumnSearch(
  cs: Record<string, string> | null | undefined,
): Record<string, string> | null {
  if (!cs) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(cs)) {
    const t = v?.trim();
    if (t) out[k] = t;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function pageBounds(page: number, pageSize: number) {
  const size = Math.max(1, Math.min(Math.floor(pageSize), 500));
  const p = Math.max(1, Math.floor(page));
  return { size, offset: (p - 1) * size };
}

/** RPC trả dòng phẳng, đã có sẵn tên khoản mục / tài khoản / xã phường / người lập. */
function rpcRowToListRow(r: Record<string, unknown>): QuySoThuChiListRow {
  return {
    id: String(r.id ?? ''),
    quy: String(r.quy ?? '') as QuyKey,
    loai: String(r.loai ?? 'thu') as QuyLoai,
    so_chung_tu: String(r.so_chung_tu ?? ''),
    ngay_chung_tu: dateOnly(r.ngay_chung_tu),
    khoan_id: String(r.khoan_id ?? ''),
    ten_khoan: nullableStr(r.ten_khoan),
    tai_khoan_id: String(r.tai_khoan_id ?? ''),
    ten_tai_khoan: nullableStr(r.ten_tai_khoan),
    so_tien: toNumber(r.so_tien),
    noi_dung: String(r.noi_dung ?? ''),
    nguoi_nop_nhan: nullableStr(r.nguoi_nop_nhan),
    don_vi_id: nullableStr(r.don_vi_id),
    ten_don_vi: nullableStr(r.ten_don_vi),
    chung_tu_goc: nullableStr(r.chung_tu_goc),
    ghi_chu: nullableStr(r.ghi_chu),
    id_nguoi_tao: nullableStr(r.id_nguoi_tao),
    ho_va_ten_nguoi_tao: nullableStr(r.ho_va_ten_nguoi_tao),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
  };
}

/** Dòng đọc thẳng từ bảng (một phiếu) — tên khoản/tài khoản do người gọi ghép. */
function tableRowToDetail(row: Record<string, unknown>): QuySoThuChiDetail {
  const dv = pickEmbedded<{ ten?: string }>(row.don_vi);
  const nt = pickEmbedded<{ ho_va_ten?: string }>(row.nguoi_tao);
  return {
    id: String(row.id ?? ''),
    quy: String(row.quy ?? '') as QuyKey,
    loai: String(row.loai ?? 'thu') as QuyLoai,
    so_chung_tu: String(row.so_chung_tu ?? ''),
    ngay_chung_tu: dateOnly(row.ngay_chung_tu),
    khoan_id: String(row.khoan_id ?? ''),
    ten_khoan: null,
    tai_khoan_id: String(row.tai_khoan_id ?? ''),
    ten_tai_khoan: null,
    so_tien: toNumber(row.so_tien),
    noi_dung: String(row.noi_dung ?? ''),
    nguoi_nop_nhan: nullableStr(row.nguoi_nop_nhan),
    don_vi_id: nullableStr(row.don_vi_id),
    ten_don_vi: nullableStr(dv?.ten),
    chung_tu_goc: nullableStr(row.chung_tu_goc),
    ghi_chu: nullableStr(row.ghi_chu),
    id_nguoi_tao: nullableStr(row.id_nguoi_tao),
    ho_va_ten_nguoi_tao: nullableStr(nt?.ho_va_ten),
    tg_tao: String(row.tg_tao ?? ''),
    tg_cap_nhat: String(row.tg_cap_nhat ?? ''),
  };
}

// ---------------------------------------------------------------------------
// Phân trang phía máy chủ
// ---------------------------------------------------------------------------

export type QuySoThuChiPageQuery = {
  quy: QuyKey;
  page: number;
  pageSize: number;
  search: string;
  sort?: ServerSortState | null;
  /** `null` = cả thu lẫn chi. */
  loai: QuyLoai | null;
  khoanIds: string[];
  taiKhoanIds: string[];
  tuNgay: string | null;
  denNgay: string | null;
  columnSearch: Record<string, string> | null;
};

export type QuySoThuChiPageResult = {
  rows: QuySoThuChiListRow[];
  hasNextPage: boolean;
  totalRecords: number;
  /** Tổng của toàn bộ tập đã lọc — RPC lặp lại trên mỗi dòng. */
  tong: QuySoThuChiTong;
};

const TONG_RONG: QuySoThuChiTong = { tongThu: 0, tongChi: 0, soDu: 0 };

export async function getQuySoThuChiPage(
  q: QuySoThuChiPageQuery,
): Promise<QuySoThuChiPageResult> {
  const supabase = getSupabase();
  if (!supabase) return { rows: [], hasNextPage: false, totalRecords: 0, tong: TONG_RONG };
  const { size, offset } = pageBounds(q.page, q.pageSize);
  const search = q.search?.trim() ?? '';

  const { data, error } = await supabase.rpc('get_quy_so_thu_chi_page', {
    p_quy: q.quy,
    p_search: search.length > 0 ? search : null,
    p_limit: size,
    p_offset: offset,
    p_sort: buildRpcSortParam(q.sort, QUY_SO_THU_CHI_SERVER_SORT_COLUMNS),
    p_loai: q.loai,
    p_khoan_ids: toIdArray(q.khoanIds),
    p_tai_khoan_ids: toIdArray(q.taiKhoanIds),
    p_tu_ngay: q.tuNgay && q.tuNgay.trim() !== '' ? q.tuNgay : null,
    p_den_ngay: q.denNgay && q.denNgay.trim() !== '' ? q.denNgay : null,
    p_column_search: cleanColumnSearch(q.columnSearch),
  } as never);
  if (error) handleSupabaseError(error);

  const raw = (data ?? []) as unknown as Record<string, unknown>[];
  const rows = raw.map(rpcRowToListRow);

  const first = raw[0];
  const tong: QuySoThuChiTong = first
    ? {
        tongThu: toNumber(first.tong_thu),
        tongChi: toNumber(first.tong_chi),
        soDu: toNumber(first.tong_thu) - toNumber(first.tong_chi),
      }
    : TONG_RONG;

  const totalFromPage = readRpcTotalCount(raw);
  // Trang rỗng ngoài trang 1 không mang được tổng ⇒ hỏi lại trang đầu thay vì
  // đoán theo offset (đoán sẽ sai ngay khi bộ lọc vừa thu hẹp kết quả).
  if (totalFromPage == null && offset > 0) {
    const firstPage = await getQuySoThuChiPage({ ...q, page: 1, pageSize: 1 });
    return { rows, hasNextPage: false, totalRecords: firstPage.totalRecords, tong: firstPage.tong };
  }
  const totalRecords = totalFromPage ?? 0;
  return { rows, hasNextPage: offset + rows.length < totalRecords, totalRecords, tong };
}

/** Kéo toàn bộ dòng khớp bộ lọc theo từng lô 500 — dùng cho Xuất phạm vi "Tất cả". */
export function getQuySoThuChiAllForExport(
  q: Omit<QuySoThuChiPageQuery, 'page' | 'pageSize'>,
): Promise<QuySoThuChiListRow[]> {
  return fetchAllServerPages(q, getQuySoThuChiPage);
}

// ---------------------------------------------------------------------------
// Đọc / ghi một phiếu
// ---------------------------------------------------------------------------

export async function getQuySoThuChiById(id: string): Promise<QuySoThuChiDetail | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select(QUY_SO_THU_CHI_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return tableRowToDetail(data as unknown as Record<string, unknown>);
}

/**
 * `quy` lấy từ route; `so_chung_tu` và `id_nguoi_tao` KHÔNG gửi lên — DB tự
 * sinh số chứng từ và tự gán người lập từ phiên đăng nhập.
 */
function formToInsertPayload(quy: QuyKey, data: QuySoThuChiFormValues) {
  return {
    quy,
    loai: data.loai,
    ngay_chung_tu: data.ngay_chung_tu,
    khoan_id: Number(data.khoan_id),
    tai_khoan_id: Number(data.tai_khoan_id),
    so_tien: parseTienInput(data.so_tien),
    noi_dung: data.noi_dung.trim(),
    nguoi_nop_nhan: nullableStr(data.nguoi_nop_nhan),
    don_vi_id: toNullableId(data.don_vi_id),
    chung_tu_goc: nullableStr(data.chung_tu_goc),
    ghi_chu: nullableStr(data.ghi_chu),
  };
}

/**
 * Sửa phiếu: **không gửi `loai`**.
 *
 * Trigger `fn_quy_chan_doi_so_chung_tu` chỉ chạy khi cột `loai` hoặc
 * `so_chung_tu` thực sự nằm trong câu UPDATE. Gửi lại `loai` y nguyên vẫn kích
 * hoạt trigger và vẫn qua (vì `IS DISTINCT FROM` là false), nhưng bỏ hẳn ra cho
 * rõ ràng: phiếu đã phát hành thì loại là bất biến, form cũng khóa ô đó.
 */
function formToUpdatePayload(data: QuySoThuChiFormValues) {
  return {
    ngay_chung_tu: data.ngay_chung_tu,
    khoan_id: Number(data.khoan_id),
    tai_khoan_id: Number(data.tai_khoan_id),
    so_tien: parseTienInput(data.so_tien),
    noi_dung: data.noi_dung.trim(),
    nguoi_nop_nhan: nullableStr(data.nguoi_nop_nhan),
    don_vi_id: toNullableId(data.don_vi_id),
    chung_tu_goc: nullableStr(data.chung_tu_goc),
    ghi_chu: nullableStr(data.ghi_chu),
  };
}

export async function createQuySoThuChi(
  quy: QuyKey,
  data: QuySoThuChiFormValues,
): Promise<QuySoThuChiDetail> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Chưa cấu hình kết nối máy chủ dữ liệu.');
  const { data: inserted, error } = await supabase
    .from(TABLE)
    .insert(formToInsertPayload(quy, data))
    .select(QUY_SO_THU_CHI_RETURNING)
    .single();
  if (error) handleSupabaseError(error);
  return tableRowToDetail(inserted as unknown as Record<string, unknown>);
}

export async function updateQuySoThuChi(
  id: string,
  data: QuySoThuChiFormValues,
): Promise<QuySoThuChiDetail> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Chưa cấu hình kết nối máy chủ dữ liệu.');
  const { data: updated, error } = await supabase
    .from(TABLE)
    .update(formToUpdatePayload(data))
    .eq('id', id)
    .select(QUY_SO_THU_CHI_RETURNING)
    .single();
  if (error) handleSupabaseError(error);
  return tableRowToDetail(updated as unknown as Record<string, unknown>);
}

export async function deleteQuySoThuChiMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = getSupabase();
  if (!supabase) throw new Error('Chưa cấu hình kết nối máy chủ dữ liệu.');
  const { error } = await supabase.from(TABLE).delete().in('id', ids);
  if (error) handleSupabaseError(error);
}

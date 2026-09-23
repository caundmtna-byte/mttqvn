import { createRepository } from '@/lib/data/create-repository';
import {
  buildRpcSortParam,
  fetchAllServerPages,
  readRpcTotalCount,
  type ServerSortState,
} from '@/lib/data/server-paging';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type {
  KhenThuongNhaTaiTroFormValues,
  KhenThuongNhaTaiTroStatusChangeValues,
} from '../core/schema';
import type { KhenThuongNhaTaiTro } from '../core/types';
import {
  KTNT_CAP_KHEN_DEFAULT,
  KTNT_TRANG_THAI_DEFAULT,
  type KtntCapKhen,
  type KtntTrangThai,
} from '../core/constants';

type RepoRow = { id: string } & Record<string, unknown>;

const TABLE = 'ktnt_khen_thuong_nha_tai_tro';

/**
 * Tên khoá ngoại khớp CHÍNH XÁC migration `20260923110000_…`. Select trên bảng
 * chỉ dùng cho ghi / đọc một dòng — cột thành tích không có ở đây (RPC tính).
 */
const SELECT = [
  'id',
  'noi_dung_khen',
  'ngay_khen',
  'so_quyet_dinh',
  'cap_khen',
  'don_vi_khen',
  'xa_phuong_id',
  'nha_tai_tro_id',
  'nam_thanh_tich_tu',
  'nam_thanh_tich_den',
  'gia_tri_dong_gop_khac',
  'trang_thai',
  'ngay_cap_nhat_trang_thai',
  'nguoi_duyet_id',
  'tg_duyet',
  'ghi_chu',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
  'xa_phuong:var_ssn_xa_phuong!ktnt_khen_thuong_nha_tai_tro_xa_phuong_id_fkey(ten)',
  'nha_tai_tro:kho_don_vi_cuu_tro!ktnt_khen_thuong_nha_tai_tro_nha_tai_tro_id_fkey(ten,loai)',
  'nguoi_duyet:var_nhan_vien!ktnt_khen_thuong_nha_tai_tro_nguoi_duyet_id_fkey(ho_va_ten)',
  'nguoi_tao:var_nhan_vien!ktnt_khen_thuong_nha_tai_tro_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)',
].join(',');

const repo = createRepository<RepoRow>({ tableName: TABLE, select: SELECT });

function pickEmbedded<T extends Record<string, unknown>>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? undefined;
  return v as T;
}

function nullableStr(v: unknown): string | null {
  const s = v == null ? '' : String(v).trim();
  return s === '' ? null : s;
}

function nullableNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const num0 = (v: unknown) => nullableNum(v) ?? 0;

export function flattenKhenThuongNhaTaiTroRow(row: Record<string, unknown>): KhenThuongNhaTaiTro {
  const xp = pickEmbedded<{ ten?: string }>(row.xa_phuong);
  const nt = pickEmbedded<{ ten?: string; loai?: string }>(row.nha_tai_tro);
  const nd = pickEmbedded<{ ho_va_ten?: string }>(row.nguoi_duyet);
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const r = row;
  const tongTienHoTro = num0(r.tong_tien_ho_tro);
  const giaTriKhac = nullableNum(r.gia_tri_dong_gop_khac);

  return {
    id: String(r.id ?? ''),
    noi_dung_khen: String(r.noi_dung_khen ?? ''),
    ngay_khen: String(r.ngay_khen ?? '').slice(0, 10),
    so_quyet_dinh: nullableStr(r.so_quyet_dinh),
    cap_khen: String(r.cap_khen ?? KTNT_CAP_KHEN_DEFAULT) as KtntCapKhen,
    don_vi_khen: nullableStr(r.don_vi_khen),
    xa_phuong_id: nullableStr(r.xa_phuong_id),
    ten_xa_phuong: nullableStr(xp?.ten),
    nha_tai_tro_id: String(r.nha_tai_tro_id ?? ''),
    ten_nha_tai_tro: nullableStr(nt?.ten),
    loai_nha_tai_tro: nullableStr(nt?.loai),
    nam_thanh_tich_tu: nullableNum(r.nam_thanh_tich_tu),
    nam_thanh_tich_den: nullableNum(r.nam_thanh_tich_den),
    gia_tri_dong_gop_khac: giaTriKhac,
    so_khoan_ho_tro: num0(r.so_khoan_ho_tro),
    so_nguoi_duoc_ho_tro: num0(r.so_nguoi_duoc_ho_tro),
    tong_tien_ho_tro: tongTienHoTro,
    tong_gia_tri: r.tong_gia_tri != null ? num0(r.tong_gia_tri) : tongTienHoTro + (giaTriKhac ?? 0),
    trang_thai: String(r.trang_thai ?? KTNT_TRANG_THAI_DEFAULT) as KtntTrangThai,
    ngay_cap_nhat_trang_thai: String(r.ngay_cap_nhat_trang_thai ?? ''),
    nguoi_duyet_id: nullableStr(r.nguoi_duyet_id),
    ho_va_ten_nguoi_duyet: nullableStr(nd?.ho_va_ten),
    tg_duyet: nullableStr(r.tg_duyet),
    ghi_chu: nullableStr(r.ghi_chu),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nullableStr(nv?.ho_va_ten),
    ten_tai_khoan_nguoi_tao: nullableStr(nv?.ten_tai_khoan),
  };
}

const toFk = (v: string | undefined) => {
  const n = Number(v);
  return v && Number.isFinite(n) ? n : null;
};

/** Ngày trạng thái / người duyệt cố ý KHÔNG có ở đây: trigger DB gán. */
function formToPayload(data: KhenThuongNhaTaiTroFormValues): Record<string, unknown> {
  return {
    noi_dung_khen: data.noi_dung_khen,
    ngay_khen: data.ngay_khen,
    so_quyet_dinh: data.so_quyet_dinh ?? null,
    cap_khen: data.cap_khen,
    don_vi_khen: data.don_vi_khen ?? null,
    xa_phuong_id: toFk(data.xa_phuong_id),
    nha_tai_tro_id: toFk(data.nha_tai_tro_id),
    nam_thanh_tich_tu: data.nam_thanh_tich_tu ?? null,
    nam_thanh_tich_den: data.nam_thanh_tich_den ?? null,
    gia_tri_dong_gop_khac: data.gia_tri_dong_gop_khac ?? null,
    trang_thai: data.trang_thai,
    ghi_chu: data.ghi_chu ?? null,
  };
}

// ---------------------------------------------------------------------------
// Phân trang phía máy chủ (RPC)
// ---------------------------------------------------------------------------

/** Phải khớp khối ORDER BY của `get_ktnt_page`. */
export const KTNT_SERVER_SORT_COLUMNS = [
  'ngay_khen',
  'noi_dung_khen',
  'so_quyet_dinh',
  'cap_khen',
  'don_vi_khen',
  'ten_xa_phuong',
  'ten_nha_tai_tro',
  'loai_nha_tai_tro',
  'so_khoan_ho_tro',
  'so_nguoi_duoc_ho_tro',
  'tong_tien_ho_tro',
  'tong_gia_tri',
  'trang_thai',
  'ngay_cap_nhat_trang_thai',
  'ho_va_ten_nguoi_duyet',
  'ghi_chu',
  'ho_va_ten_nguoi_tao',
  'tg_cap_nhat',
] as const;

export type KtntPageQuery = {
  page: number;
  pageSize: number;
  search: string;
  sort?: ServerSortState | null;
  viewAll: boolean;
  viewerXaPhuongId: string | null;
  nam: readonly string[];
  capKhen: readonly string[];
  trangThai: readonly string[];
  xaPhuongIds: readonly string[];
  nhaTaiTroIds: readonly string[];
  loaiNhaTaiTro: readonly string[];
  columnSearch: Record<string, string> | null;
};

export type KtntPageResult = {
  rows: KhenThuongNhaTaiTro[];
  hasNextPage: boolean;
  totalRecords: number;
};

const toIds = (list: readonly string[]) => {
  const out = list.map((x) => Number(String(x).trim())).filter((n) => Number.isFinite(n));
  return out.length > 0 ? out : null;
};
const toTexts = (list: readonly string[]) => (list.length > 0 ? [...list] : null);

function cleanColumnSearch(cs: Record<string, string> | null | undefined) {
  if (!cs) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(cs)) {
    const t = v?.trim();
    if (t) out[k] = t;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** RPC trả dòng phẳng — dựng lại hình dạng embed để dùng chung hàm flatten. */
function rpcRow(raw: Record<string, unknown>): KhenThuongNhaTaiTro {
  const {
    ten_xa_phuong,
    ten_nha_tai_tro,
    loai_nha_tai_tro,
    ho_va_ten_nguoi_duyet,
    ho_va_ten_nguoi_tao,
    ten_tai_khoan_nguoi_tao,
    total_count: _total,
    ...base
  } = raw;
  return flattenKhenThuongNhaTaiTroRow({
    ...base,
    xa_phuong: { ten: ten_xa_phuong },
    nha_tai_tro: { ten: ten_nha_tai_tro, loai: loai_nha_tai_tro },
    nguoi_duyet: { ho_va_ten: ho_va_ten_nguoi_duyet },
    nguoi_tao: { ho_va_ten: ho_va_ten_nguoi_tao, ten_tai_khoan: ten_tai_khoan_nguoi_tao },
  });
}

export async function getKhenThuongNhaTaiTroPage(q: KtntPageQuery): Promise<KtntPageResult> {
  const supabase = getSupabase();
  if (!supabase) return { rows: [], hasNextPage: false, totalRecords: 0 };
  const pageSize = Math.max(1, Math.min(Math.floor(q.pageSize), 500));
  const page = Math.max(1, Math.floor(q.page));
  const offset = (page - 1) * pageSize;
  const search = q.search?.trim() ?? '';
  const viewerXa = q.viewerXaPhuongId?.trim();

  const { data, error } = await supabase.rpc('get_ktnt_page', {
    p_search: search.length > 0 ? search : null,
    p_limit: pageSize,
    p_offset: offset,
    p_sort: buildRpcSortParam(q.sort, KTNT_SERVER_SORT_COLUMNS),
    p_view_all: q.viewAll,
    p_viewer_xa_phuong_id: viewerXa ? Number(viewerXa) : null,
    p_nam: toIds(q.nam),
    p_cap_khen: toTexts(q.capKhen),
    p_trang_thai: toTexts(q.trangThai),
    p_xa_phuong_ids: toIds(q.xaPhuongIds),
    p_nha_tai_tro_ids: toIds(q.nhaTaiTroIds),
    p_loai_nha_tai_tro: toTexts(q.loaiNhaTaiTro),
    p_column_search: cleanColumnSearch(q.columnSearch),
  } as never);
  if (error) handleSupabaseError(error);

  const raw = (data ?? []) as unknown as Record<string, unknown>[];
  const rows = raw.map(rpcRow);
  const totalFromPage = readRpcTotalCount(raw);
  const totalRecords =
    totalFromPage ??
    (offset > 0 ? (await getKhenThuongNhaTaiTroPage({ ...q, page: 1, pageSize: 1 })).totalRecords : 0);
  return { rows, hasNextPage: offset + rows.length < totalRecords, totalRecords };
}

/** Toàn bộ dòng khớp bộ lọc (lô 500) — xuất file "Tất cả" và tab Thống kê. */
export function getKhenThuongNhaTaiTroAll(
  q: Omit<KtntPageQuery, 'page' | 'pageSize'>,
): Promise<KhenThuongNhaTaiTro[]> {
  return fetchAllServerPages(q, getKhenThuongNhaTaiTroPage);
}

export async function getKhenThuongNhaTaiTroById(id: string): Promise<KhenThuongNhaTaiTro | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from(TABLE).select(SELECT).eq('id', id).maybeSingle();
  if (error) handleSupabaseError(error);
  return data ? flattenKhenThuongNhaTaiTroRow(data as unknown as Record<string, unknown>) : null;
}

export async function createKhenThuongNhaTaiTro(
  data: KhenThuongNhaTaiTroFormValues,
  idNguoiTao: string,
): Promise<KhenThuongNhaTaiTro> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('khenThuongNhaTaiTro.service.noEmployeeProfile'));
  const now = new Date().toISOString();
  const inserted = await repo.insert(
    { ...formToPayload(data), id_nguoi_tao: Number(trimmed), tg_tao: now, tg_cap_nhat: now },
    { returningSelect: SELECT },
  );
  return flattenKhenThuongNhaTaiTroRow(inserted as unknown as Record<string, unknown>);
}

export async function updateKhenThuongNhaTaiTro(
  id: string,
  data: KhenThuongNhaTaiTroFormValues,
): Promise<KhenThuongNhaTaiTro> {
  const updated = await repo.update(
    id,
    { ...formToPayload(data), tg_cap_nhat: new Date().toISOString() },
    { returningSelect: SELECT },
  );
  return flattenKhenThuongNhaTaiTroRow(updated as unknown as Record<string, unknown>);
}

/**
 * Đổi RIÊNG trạng thái + lý do. Luật chuyển do trigger `fn_kiem_luat_trang_thai`,
 * quyền Duyệt do `fn_ktnt_kiem_quyen_phe_duyet` — DB từ chối nếu sai.
 */
export async function updateKhenThuongNhaTaiTroTrangThai(
  id: string,
  data: KhenThuongNhaTaiTroStatusChangeValues,
): Promise<KhenThuongNhaTaiTro> {
  const updated = await repo.update(
    id,
    { trang_thai: data.trang_thai, ghi_chu: data.ghi_chu ?? null, tg_cap_nhat: new Date().toISOString() },
    { returningSelect: SELECT },
  );
  return flattenKhenThuongNhaTaiTroRow(updated as unknown as Record<string, unknown>);
}

export async function deleteKhenThuongNhaTaiTroMany(ids: string[]): Promise<void> {
  await repo.remove(ids);
}

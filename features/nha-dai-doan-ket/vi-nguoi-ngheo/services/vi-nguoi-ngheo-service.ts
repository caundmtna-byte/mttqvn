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
import { fetchAllPages } from '@/lib/supabase/fetch-all-pages';
import type { ViNguoiNgheoFormValues, ViNguoiNgheoStatusChangeValues } from '../core/schema';
import type { ViNguoiNgheo } from '../core/types';
import type {
  VnnDoiTuong,
  VnnHinhThuc,
  VnnLinhVuc,
  VnnNguon,
  VnnNguonHoTro,
  VnnTrangThai,
} from '../core/constants';
import {
  VNN_HINH_THUC_DEFAULT,
  VNN_LINH_VUC_DEFAULT,
  VNN_NGUON_DEFAULT,
  VNN_NGUON_HO_TRO_DEFAULT,
  VNN_TRANG_THAI_DEFAULT,
} from '../core/constants';
import { VNN_RETURNING, VNN_SELECT } from '../core/supabase-select';

type RepoRow = { id: string } & Record<string, unknown>;

const TABLE = 'vnn_chuong_trinh';

const repo = createRepository<RepoRow>({
  tableName: TABLE,
  select: VNN_SELECT,
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

function nullableNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function nullableFk(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function embeddedName(v: unknown): string | null {
  const s = v == null ? '' : String(v).trim();
  return s === '' ? null : s;
}

export function flattenViNguoiNgheoRow(row: Record<string, unknown>): ViNguoiNgheo {
  const xp = pickEmbedded<{ ten?: string }>(row.xa_phuong);
  const dv = pickEmbedded<{ ten?: string }>(row.don_vi_ho_tro);
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const r = row;

  return {
    id: String(r.id ?? ''),
    noi_dung_ho_tro: String(r.noi_dung_ho_tro ?? ''),
    nam: Number(r.nam ?? 0),
    linh_vuc_ho_tro: String(r.linh_vuc_ho_tro ?? VNN_LINH_VUC_DEFAULT) as VnnLinhVuc,
    nguon: String(r.nguon ?? VNN_NGUON_DEFAULT) as VnnNguon,
    nguon_ho_tro: String(r.nguon_ho_tro ?? VNN_NGUON_HO_TRO_DEFAULT) as VnnNguonHoTro,
    ho_ngheo_id: nullableStr(r.ho_ngheo_id),
    ho_ten_nguoi_nhan: String(r.ho_ten_nguoi_nhan ?? ''),
    xa_phuong_id: nullableStr(r.xa_phuong_id),
    ten_xa_phuong: embeddedName(xp?.ten),
    khoi_xom: nullableStr(r.khoi_xom),
    doi_tuong: (nullableStr(r.doi_tuong) as VnnDoiTuong | null) ?? null,
    hinh_thuc_ho_tro: String(r.hinh_thuc_ho_tro ?? VNN_HINH_THUC_DEFAULT) as VnnHinhThuc,
    so_tien: nullableNum(r.so_tien),
    trang_thai: String(r.trang_thai ?? VNN_TRANG_THAI_DEFAULT) as VnnTrangThai,
    ngay_cap_nhat_trang_thai: String(r.ngay_cap_nhat_trang_thai ?? ''),
    don_vi_ho_tro_id: nullableStr(r.don_vi_ho_tro_id),
    ten_don_vi_ho_tro: embeddedName(dv?.ten),
    ghi_chu: nullableStr(r.ghi_chu),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: embeddedName(nv?.ho_va_ten),
    ten_tai_khoan_nguoi_tao: embeddedName(nv?.ten_tai_khoan),
  };
}

/**
 * `ngay_cap_nhat_trang_thai` cố ý KHÔNG có ở đây: trigger
 * `fn_vnn_set_ngay_trang_thai` dưới DB gán, client gửi lên cũng bị ghi đè.
 */
function formToPayload(data: ViNguoiNgheoFormValues): Record<string, unknown> {
  return {
    noi_dung_ho_tro: data.noi_dung_ho_tro,
    nam: data.nam,
    linh_vuc_ho_tro: data.linh_vuc_ho_tro,
    nguon: data.nguon,
    nguon_ho_tro: data.nguon_ho_tro,
    ho_ngheo_id: nullableFk(data.ho_ngheo_id),
    ho_ten_nguoi_nhan: data.ho_ten_nguoi_nhan,
    xa_phuong_id: nullableFk(data.xa_phuong_id),
    khoi_xom: data.khoi_xom ?? null,
    doi_tuong: data.doi_tuong ?? null,
    hinh_thuc_ho_tro: data.hinh_thuc_ho_tro,
    so_tien: data.so_tien ?? null,
    trang_thai: data.trang_thai,
    don_vi_ho_tro_id: nullableFk(data.don_vi_ho_tro_id),
    ghi_chu: data.ghi_chu ?? null,
  };
}

/**
 * Danh sách phẳng — dùng cho tab Thống kê (gom nhóm cần toàn bộ dòng). Tab Danh
 * sách đi qua `getViNguoiNgheoPage`.
 */
export async function getViNguoiNgheoList(): Promise<ViNguoiNgheo[]> {
  const list = await repo.getAll({ orderBy: 'tg_cap_nhat', ascending: false });
  return list.map((row) => flattenViNguoiNgheoRow(row as unknown as Record<string, unknown>));
}

/** Các khoản đã gắn cho một hộ nghèo — màn chi tiết hộ nghèo đọc lại từ đây. */
export async function getViNguoiNgheoByHoNgheo(hoNgheoId: string): Promise<ViNguoiNgheo[]> {
  const supabase = getSupabase();
  if (!supabase || !hoNgheoId.trim()) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select(VNN_SELECT)
    .eq('ho_ngheo_id', hoNgheoId)
    .order('nam', { ascending: false })
    .order('id', { ascending: false });
  if (error) handleSupabaseError(error);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(flattenViNguoiNgheoRow);
}

/**
 * Các khoản một nhà tài trợ đã hỗ trợ, trong kỳ năm (NULL một đầu = không giới
 * hạn). Màn Khen thưởng nhà tài trợ đọc "thành tích" từ đây — cùng điều kiện
 * với cột tổng hợp trong `get_ktnt_page`.
 */
export async function getViNguoiNgheoByDonVi(
  donViId: string,
  tuNam: number | null,
  denNam: number | null,
): Promise<ViNguoiNgheo[]> {
  const supabase = getSupabase();
  if (!supabase || !donViId.trim()) return [];
  const rows = await fetchAllPages<Record<string, unknown>>(
    async (from, to) => {
      let q = supabase
        .from(TABLE)
        .select(VNN_SELECT)
        .eq('don_vi_ho_tro_id', donViId)
        .order('nam', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);
      if (tuNam != null) q = q.gte('nam', tuNam);
      if (denNam != null) q = q.lte('nam', denNam);
      const { data, error } = await q;
      if (error) handleSupabaseError(error);
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
    { label: 'vnn_chuong_trinh theo nhà tài trợ' },
  );
  return rows.map(flattenViNguoiNgheoRow);
}

// ---------------------------------------------------------------------------
// Phân trang phía máy chủ (RPC) — xem CLAUDE.md "Chọn kiểu phân trang"
// ---------------------------------------------------------------------------

/** Cột được RPC sắp xếp; phải khớp khối ORDER BY trong migration `get_vnn_page`. */
export const VNN_SERVER_SORT_COLUMNS = [
  'nam',
  'noi_dung_ho_tro',
  'linh_vuc_ho_tro',
  'nguon',
  'nguon_ho_tro',
  'ho_ten_nguoi_nhan',
  'ten_xa_phuong',
  'khoi_xom',
  'doi_tuong',
  'hinh_thuc_ho_tro',
  'so_tien',
  'trang_thai',
  'ngay_cap_nhat_trang_thai',
  'ten_don_vi_ho_tro',
  'ghi_chu',
  'ho_va_ten_nguoi_tao',
  'tg_cap_nhat',
] as const;

export type VnnPageQuery = {
  page: number;
  pageSize: number;
  search: string;
  sort?: ServerSortState | null;
  /** Phạm vi xem — suy từ `useVnnViewer`. */
  viewAll: boolean;
  viewerXaPhuongId: string | null;
  nam: readonly string[];
  linhVuc: readonly string[];
  nguon: readonly string[];
  nguonHoTro: readonly string[];
  doiTuong: readonly string[];
  hinhThuc: readonly string[];
  trangThai: readonly string[];
  xaPhuongIds: readonly string[];
  columnSearch: Record<string, string> | null;
};

export type VnnPageResult = {
  rows: ViNguoiNgheo[];
  hasNextPage: boolean;
  totalRecords: number;
};

function toNullableId(v: string | null | undefined): number | null {
  if (v == null) return null;
  const t = String(v).trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function toIdArray(list: readonly string[]): number[] | null {
  const out = list.map((x) => Number(String(x).trim())).filter((n) => Number.isFinite(n));
  return out.length > 0 ? out : null;
}

function toIntArray(list: readonly string[]): number[] | null {
  const out = list
    .map((x) => Number.parseInt(String(x).trim(), 10))
    .filter((n) => Number.isFinite(n));
  return out.length > 0 ? out : null;
}

function toTextArray(list: readonly string[]): string[] | null {
  return list.length > 0 ? [...list] : null;
}

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

/** RPC trả dòng phẳng — dựng lại hình dạng embed để dùng chung hàm flatten. */
function rpcRowToViNguoiNgheo(raw: Record<string, unknown>): ViNguoiNgheo {
  const {
    ten_xa_phuong,
    ten_don_vi_ho_tro,
    ho_va_ten_nguoi_tao,
    ten_tai_khoan_nguoi_tao,
    total_count: _totalCount,
    ...base
  } = raw;
  return flattenViNguoiNgheoRow({
    ...base,
    xa_phuong: { ten: ten_xa_phuong },
    don_vi_ho_tro: { ten: ten_don_vi_ho_tro },
    nguoi_tao: { ho_va_ten: ho_va_ten_nguoi_tao, ten_tai_khoan: ten_tai_khoan_nguoi_tao },
  });
}

export async function getViNguoiNgheoPage(q: VnnPageQuery): Promise<VnnPageResult> {
  const supabase = getSupabase();
  if (!supabase) return { rows: [], hasNextPage: false, totalRecords: 0 };
  const pageSize = Math.max(1, Math.min(Math.floor(q.pageSize), 500));
  const page = Math.max(1, Math.floor(q.page));
  const offset = (page - 1) * pageSize;
  const search = q.search?.trim() ?? '';

  const { data, error } = await supabase.rpc('get_vnn_page', {
    p_search: search.length > 0 ? search : null,
    p_limit: pageSize,
    p_offset: offset,
    p_sort: buildRpcSortParam(q.sort, VNN_SERVER_SORT_COLUMNS),
    p_view_all: q.viewAll,
    p_viewer_xa_phuong_id: toNullableId(q.viewerXaPhuongId),
    p_nam: toIntArray(q.nam),
    p_linh_vuc: toTextArray(q.linhVuc),
    p_nguon: toTextArray(q.nguon),
    p_nguon_ho_tro: toTextArray(q.nguonHoTro),
    p_doi_tuong: toTextArray(q.doiTuong),
    p_hinh_thuc: toTextArray(q.hinhThuc),
    p_trang_thai: toTextArray(q.trangThai),
    p_xa_phuong_ids: toIdArray(q.xaPhuongIds),
    p_column_search: cleanColumnSearch(q.columnSearch),
  } as never);
  if (error) handleSupabaseError(error);

  const raw = (data ?? []) as unknown as Record<string, unknown>[];
  const rows = raw.map(rpcRowToViNguoiNgheo);
  const totalFromPage = readRpcTotalCount(raw);
  // Trang rỗng ngoài trang 1 không mang được tổng ⇒ hỏi lại trang đầu.
  const totalRecords =
    totalFromPage ??
    (offset > 0 ? (await getViNguoiNgheoPage({ ...q, page: 1, pageSize: 1 })).totalRecords : 0);
  return { rows, hasNextPage: offset + rows.length < totalRecords, totalRecords };
}

/** Kéo toàn bộ bản ghi khớp bộ lọc để xuất file (từng lô 500 dòng). */
export function getViNguoiNgheoAllForExport(
  q: Omit<VnnPageQuery, 'page' | 'pageSize'>,
): Promise<ViNguoiNgheo[]> {
  return fetchAllServerPages(q, getViNguoiNgheoPage);
}

export async function getViNguoiNgheoById(id: string): Promise<ViNguoiNgheo | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from(TABLE).select(VNN_SELECT).eq('id', id).maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenViNguoiNgheoRow(data as unknown as Record<string, unknown>);
}

export async function createViNguoiNgheo(
  data: ViNguoiNgheoFormValues,
  idNguoiTao: string,
): Promise<ViNguoiNgheo> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('viNguoiNgheo.service.noEmployeeProfile'));

  const inserted = await repo.insert(
    {
      ...formToPayload(data),
      id_nguoi_tao: Number(trimmed),
      tg_tao: new Date().toISOString(),
      tg_cap_nhat: new Date().toISOString(),
    },
    { returningSelect: VNN_RETURNING },
  );
  return flattenViNguoiNgheoRow(inserted as unknown as Record<string, unknown>);
}

export async function updateViNguoiNgheo(
  id: string,
  data: ViNguoiNgheoFormValues,
): Promise<ViNguoiNgheo> {
  const updated = await repo.update(
    id,
    { ...formToPayload(data), tg_cap_nhat: new Date().toISOString() },
    { returningSelect: VNN_RETURNING },
  );
  return flattenViNguoiNgheoRow(updated as unknown as Record<string, unknown>);
}

/**
 * Đổi RIÊNG trạng thái + lý do. Không đi qua `updateViNguoiNgheo` để khỏi ghi
 * đè những trường người dùng không hề chạm vào.
 */
export async function updateViNguoiNgheoTrangThai(
  id: string,
  data: ViNguoiNgheoStatusChangeValues,
): Promise<ViNguoiNgheo> {
  const updated = await repo.update(
    id,
    {
      trang_thai: data.trang_thai,
      ghi_chu: data.ghi_chu ?? null,
      tg_cap_nhat: new Date().toISOString(),
    },
    { returningSelect: VNN_RETURNING },
  );
  return flattenViNguoiNgheoRow(updated as unknown as Record<string, unknown>);
}

export async function deleteViNguoiNgheoMany(ids: string[]): Promise<void> {
  await repo.remove(ids);
}

// ---------------------------------------------------------------------------
// Tuỳ chọn "chọn hộ nghèo" cho form
// ---------------------------------------------------------------------------

export interface VnnHoNgheoOption {
  id: string;
  ho_ten_dai_dien: string;
  so_cccd: string | null;
  xa_phuong_id: string | null;
  khoi_xom: string | null;
  doi_tuong: VnnDoiTuong | null;
}

const HO_NGHEO_OPTION_COLS = 'id,ho_ten_dai_dien,so_cccd,xa_phuong_id,khoi_xom,doi_tuong';

/**
 * Toàn bộ hộ (chỉ vài cột) để tự điền người nhận. Đọc hết bằng `fetchAllPages`
 * — không `.limit()` cho ăn chắc, thiếu hộ là người dùng tưởng hộ chưa có rồi
 * nhập tay trùng. Chỉ gọi khi form đang mở.
 *
 * `xaPhuongId` khác null ⇒ cán bộ cấp xã chỉ chọn được hộ của xã mình.
 */
export async function getVnnHoNgheoOptions(
  xaPhuongId: string | null,
): Promise<VnnHoNgheoOption[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const rows = await fetchAllPages<Record<string, unknown>>(
    async (from, to) => {
      let q = supabase
        .from('hngh_thong_tin_ho_ngheo')
        .select(HO_NGHEO_OPTION_COLS)
        .order('ho_ten_dai_dien', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to);
      if (xaPhuongId) q = q.eq('xa_phuong_id', xaPhuongId);
      const { data, error } = await q;
      if (error) handleSupabaseError(error);
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
    { label: 'hngh_thong_tin_ho_ngheo (tuỳ chọn)' },
  );
  return rows.map((r) => ({
    id: String(r.id ?? ''),
    ho_ten_dai_dien: String(r.ho_ten_dai_dien ?? ''),
    so_cccd: nullableStr(r.so_cccd),
    xa_phuong_id: nullableStr(r.xa_phuong_id),
    khoi_xom: nullableStr(r.khoi_xom),
    doi_tuong: (nullableStr(r.doi_tuong) as VnnDoiTuong | null) ?? null,
  }));
}

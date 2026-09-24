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
  HoNgheoFormValues,
  HoNgheoStatusChangeValues,
} from '../core/schema';
import type { HoNgheo } from '../core/types';
import type {
  HnghDoiTuong,
  HnghTonGiao,
  HnghTrangThai,
} from '../core/constants';
import {
  HNGH_TON_GIAO_DEFAULT,
  HNGH_TRANG_THAI_DEFAULT,
} from '../core/constants';
import { HNGH_RETURNING, HNGH_SELECT } from '../core/supabase-select';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'hngh_thong_tin_ho_ngheo',
  select: HNGH_SELECT,
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

function embeddedName(v: unknown): string | null {
  const s = v == null ? '' : String(v).trim();
  return s === '' ? null : s;
}

export function flattenHoNgheoRow(row: Record<string, unknown>): HoNgheo {
  const xp = pickEmbedded<{ ten?: string }>(row.xa_phuong);
  const dt = pickEmbedded<{ ten?: string }>(row.dan_toc);
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const r = row;
  return {
    id: String(r.id ?? ''),
    ho_ten_dai_dien: String(r.ho_ten_dai_dien ?? ''),
    so_cccd: nullableStr(r.so_cccd),
    xa_phuong_id: nullableStr(r.xa_phuong_id),
    ten_xa_phuong: embeddedName(xp?.ten),
    khoi_xom: nullableStr(r.khoi_xom),
    doi_tuong: (nullableStr(r.doi_tuong) as HnghDoiTuong | null) ?? null,
    dien_thoai: nullableStr(r.dien_thoai),
    dan_toc_id: nullableStr(r.dan_toc_id),
    ten_dan_toc: embeddedName(dt?.ten),
    ton_giao: (nullableStr(r.ton_giao) as HnghTonGiao | null) ?? HNGH_TON_GIAO_DEFAULT,
    so_tai_khoan: nullableStr(r.so_tai_khoan),
    ngan_hang: nullableStr(r.ngan_hang),
    trang_thai: (nullableStr(r.trang_thai) as HnghTrangThai | null) ?? HNGH_TRANG_THAI_DEFAULT,
    ngay_cap_nhat_trang_thai: String(r.ngay_cap_nhat_trang_thai ?? ''),
    ghi_chu: nullableStr(r.ghi_chu),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: embeddedName(nv?.ho_va_ten),
    ten_tai_khoan_nguoi_tao: embeddedName(nv?.ten_tai_khoan),
  };
}

/** Cố ý KHÔNG có `ngay_cap_nhat_trang_thai`: trigger DB gán khi trạng thái đổi. */
export function formToPayload(data: HoNgheoFormValues): Record<string, unknown> {
  return {
    ho_ten_dai_dien: data.ho_ten_dai_dien.trim(),
    so_cccd: data.so_cccd ?? null,
    xa_phuong_id: nullableFk(data.xa_phuong_id),
    khoi_xom: data.khoi_xom ?? null,
    doi_tuong: data.doi_tuong ?? null,
    dien_thoai: data.dien_thoai ?? null,
    dan_toc_id: nullableFk(data.dan_toc_id),
    ton_giao: data.ton_giao,
    so_tai_khoan: data.so_tai_khoan ?? null,
    ngan_hang: data.ngan_hang ?? null,
    trang_thai: data.trang_thai,
    ghi_chu: data.ghi_chu ?? null,
  };
}

/* ------------------------------------------------------------------ *
 * Phân trang phía máy chủ
 * ------------------------------------------------------------------ */

/** Phải khớp 1-1 với khối ORDER BY của `get_hngh_page`. */
export const HNGH_SERVER_SORT_COLUMNS = [
  'ho_ten_dai_dien',
  'so_cccd',
  'ten_xa_phuong',
  'khoi_xom',
  'doi_tuong',
  'dien_thoai',
  'ten_dan_toc',
  'ton_giao',
  'so_tai_khoan',
  'ngan_hang',
  'trang_thai',
  'ghi_chu',
  'ho_va_ten_nguoi_tao',
  'ngay_cap_nhat_trang_thai',
  'tg_tao',
  'tg_cap_nhat',
] as const;

export type HnghPageQuery = {
  page: number;
  pageSize: number;
  search: string;
  sort?: ServerSortState | null;
  /** Phạm vi xem — suy từ `useHoNgheoViewer`. */
  viewAll: boolean;
  viewerXaPhuongId: string | null;
  doiTuong: readonly string[];
  tonGiao: readonly string[];
  trangThai: readonly string[];
  danTocIds: readonly string[];
  xaPhuongIds: readonly string[];
  columnSearch: Record<string, string> | null;
};

export type HnghPageResult = {
  rows: HoNgheo[];
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

function toTextArray(list: readonly string[]): string[] | null {
  return list.length > 0 ? [...list] : null;
}

/** Bỏ ô trống để RPC không phải lọc theo chuỗi rỗng; rỗng hết ⇒ null. */
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
function rpcRowToHoNgheo(raw: Record<string, unknown>): HoNgheo {
  const {
    ten_xa_phuong,
    ten_dan_toc,
    ho_va_ten_nguoi_tao,
    ten_tai_khoan_nguoi_tao,
    total_count: _totalCount,
    ...base
  } = raw;
  return flattenHoNgheoRow({
    ...base,
    xa_phuong: { ten: ten_xa_phuong },
    dan_toc: { ten: ten_dan_toc },
    nguoi_tao: { ho_va_ten: ho_va_ten_nguoi_tao, ten_tai_khoan: ten_tai_khoan_nguoi_tao },
  });
}

export async function getHoNgheoPage(q: HnghPageQuery): Promise<HnghPageResult> {
  const supabase = getSupabase();
  if (!supabase) return { rows: [], hasNextPage: false, totalRecords: 0 };
  const pageSize = Math.max(1, Math.min(Math.floor(q.pageSize), 500));
  const page = Math.max(1, Math.floor(q.page));
  const offset = (page - 1) * pageSize;
  const search = q.search?.trim() ?? '';

  const { data, error } = await supabase.rpc('get_hngh_page', {
    p_search: search.length > 0 ? search : null,
    p_limit: pageSize,
    p_offset: offset,
    p_sort: buildRpcSortParam(q.sort, HNGH_SERVER_SORT_COLUMNS),
    p_view_all: q.viewAll,
    p_viewer_xa_phuong_id: toNullableId(q.viewerXaPhuongId),
    p_doi_tuong: toTextArray(q.doiTuong),
    p_ton_giao: toTextArray(q.tonGiao),
    p_trang_thai: toTextArray(q.trangThai),
    p_dan_toc_ids: toIdArray(q.danTocIds),
    p_xa_phuong_ids: toIdArray(q.xaPhuongIds),
    p_column_search: cleanColumnSearch(q.columnSearch),
  } as never);
  if (error) handleSupabaseError(error);

  const raw = (data ?? []) as unknown as Record<string, unknown>[];
  const rows = raw.map(rpcRowToHoNgheo);
  const totalFromPage = readRpcTotalCount(raw);
  // Trang rỗng ngoài trang 1 không mang được tổng ⇒ hỏi lại trang đầu.
  const totalRecords =
    totalFromPage ??
    (offset > 0 ? (await getHoNgheoPage({ ...q, page: 1, pageSize: 1 })).totalRecords : 0);
  return { rows, hasNextPage: offset + rows.length < totalRecords, totalRecords };
}

/** Kéo toàn bộ bản ghi khớp bộ lọc để xuất file (từng lô 500 dòng). */
export function getHoNgheoAllForExport(
  q: Omit<HnghPageQuery, 'page' | 'pageSize'>,
): Promise<HoNgheo[]> {
  return fetchAllServerPages(q, getHoNgheoPage);
}

/* ------------------------------------------------------------------ *
 * CRUD hộ
 * ------------------------------------------------------------------ */

export async function getHoNgheoById(id: string): Promise<HoNgheo | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('hngh_thong_tin_ho_ngheo')
    .select(HNGH_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenHoNgheoRow(data as unknown as Record<string, unknown>);
}

export async function createHoNgheo(
  data: HoNgheoFormValues,
  idNguoiTao: string,
): Promise<HoNgheo> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('hoNgheo.service.noEmployeeProfile'));

  const inserted = await repo.insert(
    {
      ...formToPayload(data),
      id_nguoi_tao: Number(trimmed),
      tg_tao: new Date().toISOString(),
      tg_cap_nhat: new Date().toISOString(),
    },
    { returningSelect: HNGH_RETURNING },
  );
  return flattenHoNgheoRow(inserted as unknown as Record<string, unknown>);
}

export async function updateHoNgheo(id: string, data: HoNgheoFormValues): Promise<HoNgheo> {
  const updated = await repo.update(
    id,
    { ...formToPayload(data), tg_cap_nhat: new Date().toISOString() },
    { returningSelect: HNGH_RETURNING },
  );
  return flattenHoNgheoRow(updated as unknown as Record<string, unknown>);
}

/**
 * Ghi đè MỘT PHẦN — dùng cho nhập file: chỉ các cột có trong file, cột khác giữ
 * nguyên. `payload` đã qua `formToPayload` rồi lọc cột.
 */
export async function updateHoNgheoPartial(
  id: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await repo.update(
    id,
    { ...payload, tg_cap_nhat: new Date().toISOString() },
    { returningSelect: 'id' },
  );
}

/**
 * Đổi RIÊNG trạng thái + lý do, không đụng các trường khác.
 *
 * Cố ý không đi qua `updateHoNgheo`: form sửa gửi lên toàn bộ payload, nên nếu
 * ai đó đang mở hộp thoại trong lúc bản ghi được sửa ở nơi khác thì bấm Lưu sẽ
 * ghi đè cả những trường mình không hề chạm vào.
 */
export async function updateHoNgheoTrangThai(
  id: string,
  data: HoNgheoStatusChangeValues,
): Promise<HoNgheo> {
  const updated = await repo.update(
    id,
    {
      trang_thai: data.trang_thai,
      ghi_chu: data.ghi_chu ?? null,
      tg_cap_nhat: new Date().toISOString(),
    },
    { returningSelect: HNGH_RETURNING },
  );
  return flattenHoNgheoRow(updated as unknown as Record<string, unknown>);
}

export async function deleteHoNgheoMany(ids: string[]): Promise<void> {
  await repo.remove(ids);
}

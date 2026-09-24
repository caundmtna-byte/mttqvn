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
  NhaDaiDoanKetFormValues,
  NhaDaiDoanKetStatusChangeValues,
} from '../core/schema';
import type { NhaDaiDoanKet } from '../core/types';
import type {
  NddkDoiTuong,
  NddkLoaiHinh,
  NddkNguon,
  NddkNguonHoTro,
  NddkTrangThai,
} from '../core/constants';
import {
  NDDK_LOAI_HINH_DEFAULT,
  NDDK_NGUON_DEFAULT,
  NDDK_NGUON_HO_TRO_DEFAULT,
  NDDK_TRANG_THAI_DEFAULT,
} from '../core/constants';
import { NDDK_RETURNING, NDDK_SELECT } from '../core/supabase-select';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'nddk_nha_dai_doan_ket',
  select: NDDK_SELECT,
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

export function flattenNhaDaiDoanKetRow(row: Record<string, unknown>): NhaDaiDoanKet {
  const xp = pickEmbedded<{ ten?: string }>(row.xa_phuong);
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const rest = { ...row };
  delete rest.xa_phuong;
  delete rest.nguoi_tao;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id ?? ''),
    noi_dung_ho_tro: String(r.noi_dung_ho_tro ?? ''),
    nam: Number(r.nam ?? 0),
    nguon: String(r.nguon ?? NDDK_NGUON_DEFAULT) as NddkNguon,
    nguon_ho_tro: String(r.nguon_ho_tro ?? NDDK_NGUON_HO_TRO_DEFAULT) as NddkNguonHoTro,
    ho_ngheo_id: nullableStr(r.ho_ngheo_id),
    ho_ten_chu_ho: String(r.ho_ten_chu_ho ?? ''),
    xa_phuong_id: nullableStr(r.xa_phuong_id),
    ten_xa_phuong: embeddedName(xp?.ten),
    khoi_xom: nullableStr(r.khoi_xom),
    doi_tuong: (nullableStr(r.doi_tuong) as NddkDoiTuong | null) ?? null,
    loai_hinh_ho_tro: String(r.loai_hinh_ho_tro ?? NDDK_LOAI_HINH_DEFAULT) as NddkLoaiHinh,
    so_tien: nullableNum(r.so_tien),
    trang_thai: String(r.trang_thai ?? NDDK_TRANG_THAI_DEFAULT) as NddkTrangThai,
    ngay_cap_nhat_trang_thai: String(r.ngay_cap_nhat_trang_thai ?? ''),
    ghi_chu: nullableStr(r.ghi_chu),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
  };
}

/**
 * `ngay_cap_nhat_trang_thai` cố ý KHÔNG có ở đây: trigger
 * `fn_nddk_set_ngay_trang_thai` dưới DB gán, client gửi lên cũng bị ghi đè.
 */
function formToPayload(data: NhaDaiDoanKetFormValues): Record<string, unknown> {
  return {
    noi_dung_ho_tro: data.noi_dung_ho_tro,
    nam: data.nam,
    nguon: data.nguon,
    nguon_ho_tro: data.nguon_ho_tro,
    // Họ tên / xã / khối xóm / đối tượng vẫn gửi lên cho khớp màn hình, nhưng
    // trigger `fn_nddk_dong_bo_tu_ho_ngheo` ghi đè bằng dữ liệu của hộ.
    ho_ngheo_id: nullableFk(data.ho_ngheo_id),
    ho_ten_chu_ho: data.ho_ten_chu_ho,
    xa_phuong_id: nullableFk(data.xa_phuong_id),
    khoi_xom: data.khoi_xom ?? null,
    doi_tuong: data.doi_tuong ?? null,
    loai_hinh_ho_tro: data.loai_hinh_ho_tro,
    so_tien: data.so_tien ?? null,
    trang_thai: data.trang_thai,
    ghi_chu: data.ghi_chu ?? null,
  };
}

/**
 * Danh sách phẳng — dùng cho trang Thống kê (gom nhóm cần toàn bộ dòng, không
 * phải một trang). Trang danh sách đi qua `getNhaDaiDoanKetPage`.
 */
export async function getNhaDaiDoanKetList(): Promise<NhaDaiDoanKet[]> {
  const list = await repo.getAll({ orderBy: 'tg_cap_nhat', ascending: false });
  return list.map((row) => flattenNhaDaiDoanKetRow(row as unknown as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Phân trang phía máy chủ (RPC) — xem CLAUDE.md "Chọn kiểu phân trang"
// ---------------------------------------------------------------------------

/** Cột được RPC sắp xếp; phải khớp khối ORDER BY trong migration `get_nddk_page`. */
export const NDDK_SERVER_SORT_COLUMNS = [
  'nam',
  'noi_dung_ho_tro',
  'nguon',
  'nguon_ho_tro',
  'ho_ten_chu_ho',
  'ten_xa_phuong',
  'khoi_xom',
  'doi_tuong',
  'loai_hinh_ho_tro',
  'so_tien',
  'trang_thai',
  'ngay_cap_nhat_trang_thai',
  'ghi_chu',
  'ho_va_ten_nguoi_tao',
  'tg_cap_nhat',
] as const;

export type NddkPageQuery = {
  page: number;
  pageSize: number;
  search: string;
  sort?: ServerSortState | null;
  /** Phạm vi xem — suy từ `useNddkViewer`. */
  viewAll: boolean;
  viewerXaPhuongId: string | null;
  nam: readonly string[];
  nguon: readonly string[];
  nguonHoTro: readonly string[];
  doiTuong: readonly string[];
  loaiHinh: readonly string[];
  trangThai: readonly string[];
  xaPhuongIds: readonly string[];
  columnSearch: Record<string, string> | null;
};

export type NddkPageResult = {
  rows: NhaDaiDoanKet[];
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
function rpcRowToNhaDaiDoanKet(raw: Record<string, unknown>): NhaDaiDoanKet {
  const {
    ten_xa_phuong,
    ho_va_ten_nguoi_tao,
    ten_tai_khoan_nguoi_tao,
    total_count: _totalCount,
    ...base
  } = raw;
  return flattenNhaDaiDoanKetRow({
    ...base,
    xa_phuong: { ten: ten_xa_phuong },
    nguoi_tao: { ho_va_ten: ho_va_ten_nguoi_tao, ten_tai_khoan: ten_tai_khoan_nguoi_tao },
  });
}

export async function getNhaDaiDoanKetPage(q: NddkPageQuery): Promise<NddkPageResult> {
  const supabase = getSupabase();
  if (!supabase) return { rows: [], hasNextPage: false, totalRecords: 0 };
  const pageSize = Math.max(1, Math.min(Math.floor(q.pageSize), 500));
  const page = Math.max(1, Math.floor(q.page));
  const offset = (page - 1) * pageSize;
  const search = q.search?.trim() ?? '';

  const { data, error } = await supabase.rpc('get_nddk_page', {
    p_search: search.length > 0 ? search : null,
    p_limit: pageSize,
    p_offset: offset,
    p_sort: buildRpcSortParam(q.sort, NDDK_SERVER_SORT_COLUMNS),
    p_view_all: q.viewAll,
    p_viewer_xa_phuong_id: toNullableId(q.viewerXaPhuongId),
    p_nam: toIntArray(q.nam),
    p_nguon: toTextArray(q.nguon),
    p_nguon_ho_tro: toTextArray(q.nguonHoTro),
    p_doi_tuong: toTextArray(q.doiTuong),
    p_loai_hinh: toTextArray(q.loaiHinh),
    p_trang_thai: toTextArray(q.trangThai),
    p_xa_phuong_ids: toIdArray(q.xaPhuongIds),
    p_column_search: cleanColumnSearch(q.columnSearch),
  } as never);
  if (error) handleSupabaseError(error);

  const raw = (data ?? []) as unknown as Record<string, unknown>[];
  const rows = raw.map(rpcRowToNhaDaiDoanKet);
  const totalFromPage = readRpcTotalCount(raw);
  // Trang rỗng ngoài trang 1 không mang được tổng ⇒ hỏi lại trang đầu.
  const totalRecords =
    totalFromPage ??
    (offset > 0 ? (await getNhaDaiDoanKetPage({ ...q, page: 1, pageSize: 1 })).totalRecords : 0);
  return { rows, hasNextPage: offset + rows.length < totalRecords, totalRecords };
}

/** Kéo toàn bộ bản ghi khớp bộ lọc để xuất file (từng lô 500 dòng). */
export function getNhaDaiDoanKetAllForExport(
  q: Omit<NddkPageQuery, 'page' | 'pageSize'>,
): Promise<NhaDaiDoanKet[]> {
  return fetchAllServerPages(q, getNhaDaiDoanKetPage);
}

export async function getNhaDaiDoanKetById(id: string): Promise<NhaDaiDoanKet | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('nddk_nha_dai_doan_ket')
    .select(NDDK_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenNhaDaiDoanKetRow(data as unknown as Record<string, unknown>);
}

export async function createNhaDaiDoanKet(
  data: NhaDaiDoanKetFormValues,
  idNguoiTao: string,
): Promise<NhaDaiDoanKet> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('nhaDaiDoanKet.service.noEmployeeProfile'));

  const inserted = await repo.insert(
    {
      ...formToPayload(data),
      id_nguoi_tao: Number(trimmed),
      tg_tao: new Date().toISOString(),
      tg_cap_nhat: new Date().toISOString(),
    },
    { returningSelect: NDDK_RETURNING },
  );
  return flattenNhaDaiDoanKetRow(inserted as unknown as Record<string, unknown>);
}

export async function updateNhaDaiDoanKet(
  id: string,
  data: NhaDaiDoanKetFormValues,
): Promise<NhaDaiDoanKet> {
  const updated = await repo.update(
    id,
    {
      ...formToPayload(data),
      tg_cap_nhat: new Date().toISOString(),
    },
    { returningSelect: NDDK_RETURNING },
  );
  return flattenNhaDaiDoanKetRow(updated as unknown as Record<string, unknown>);
}

/**
 * Đổi RIÊNG trạng thái + lý do, không đụng các trường khác.
 *
 * Cố ý không đi qua `updateNhaDaiDoanKet`: form sửa gửi lên toàn bộ payload, nên
 * nếu ai đó đang mở hộp thoại trong lúc bản ghi được sửa ở nơi khác thì bấm Lưu
 * sẽ ghi đè cả những trường mình không hề chạm vào.
 *
 * `ngay_cap_nhat_trang_thai` do trigger gán; quyền Duyệt do trigger
 * `fn_nddk_kiem_quyen_phe_duyet` kiểm — client gửi thẳng, DB từ chối nếu thiếu.
 */
export async function updateNhaDaiDoanKetTrangThai(
  id: string,
  data: NhaDaiDoanKetStatusChangeValues,
): Promise<NhaDaiDoanKet> {
  const updated = await repo.update(
    id,
    {
      trang_thai: data.trang_thai,
      ghi_chu: data.ghi_chu ?? null,
      tg_cap_nhat: new Date().toISOString(),
    },
    { returningSelect: NDDK_RETURNING },
  );
  return flattenNhaDaiDoanKetRow(updated as unknown as Record<string, unknown>);
}

export async function deleteNhaDaiDoanKetMany(ids: string[]): Promise<void> {
  await repo.remove(ids);
}

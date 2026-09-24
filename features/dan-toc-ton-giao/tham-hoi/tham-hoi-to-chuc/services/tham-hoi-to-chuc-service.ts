import { createRepository } from '@/lib/data/create-repository';
import {
  buildRpcSortParam,
  fetchAllServerPages,
  readRpcTotalCount,
  type ServerSortState,
} from '@/lib/data/server-paging';
import { DON_VI_THAM_HOI_TINH_LABEL, DON_VI_THAM_HOI_TINH_VALUE } from '../core/constants';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { getDipTenById } from '@/features/dan-toc-ton-giao/tham-hoi/dip-tham-hoi/services/dip-tham-hoi-service';
import type { ThamHoiToChucFormValues } from '../core/schema';
import type { ThamHoiToChuc } from '../core/types';
import type { TienDoThamHoi } from '../core/constants';
import { TIEN_DO_DEFAULT } from '../core/constants';
import {
  DTTG_THAM_HOI_TO_CHUC_RETURNING,
  DTTG_THAM_HOI_TO_CHUC_SELECT,
} from '../core/supabase-select';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'dttg_tham_hoi_to_chuc',
  select: DTTG_THAM_HOI_TO_CHUC_SELECT,
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

export function flattenThamHoiToChucRow(row: Record<string, unknown>): ThamHoiToChuc {
  const tc = pickEmbedded<{ ten_co_so?: string; loai_hinh?: string }>(row.to_chuc);
  const dv = pickEmbedded<{ ten?: string }>(row.don_vi_tham_hoi);
  const dip = pickEmbedded<{ ten_dip?: string }>(row.dip);
  const pb = pickEmbedded<{ ten_phong_ban?: string }>(row.phong_ban);
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const rest = { ...row };
  delete rest.to_chuc;
  delete rest.don_vi_tham_hoi;
  delete rest.dip;
  delete rest.phong_ban;
  delete rest.nguoi_tao;
  const r = rest as Record<string, unknown>;

  const tenDip =
    dip?.ten_dip != null && String(dip.ten_dip).trim() !== ''
      ? String(dip.ten_dip)
      : String(r.dip_tham_hoi ?? '');

  return {
    id: String(r.id ?? ''),
    to_chuc_id: String(r.to_chuc_id ?? ''),
    ten_co_so: tc?.ten_co_so != null && String(tc.ten_co_so).trim() !== '' ? String(tc.ten_co_so) : null,
    loai_hinh: tc?.loai_hinh != null && String(tc.loai_hinh).trim() !== '' ? String(tc.loai_hinh) : null,
    dip_tham_hoi_id: String(r.dip_tham_hoi_id ?? ''),
    dip_tham_hoi: tenDip,
    ten_dip_tham_hoi: dip?.ten_dip != null && String(dip.ten_dip).trim() !== '' ? String(dip.ten_dip) : null,
    thoi_gian_du_kien: nullableStr(r.thoi_gian_du_kien),
    thoi_gian_thuc_te: nullableStr(r.thoi_gian_thuc_te),
    don_vi_tham_hoi_id:
      r.don_vi_tham_hoi_id == null || r.don_vi_tham_hoi_id === '' ? null : String(r.don_vi_tham_hoi_id),
    ten_don_vi_tham_hoi: dv?.ten != null && String(dv.ten).trim() !== '' ? String(dv.ten) : null,
    phong_ban_tham_muu_id:
      r.phong_ban_tham_muu_id == null || r.phong_ban_tham_muu_id === ''
        ? null
        : String(r.phong_ban_tham_muu_id),
    ten_phong_ban:
      pb?.ten_phong_ban != null && String(pb.ten_phong_ban).trim() !== ''
        ? String(pb.ten_phong_ban)
        : null,
    noi_dung_tham_hoi: nullableStr(r.noi_dung_tham_hoi),
    thanh_phan_doan: nullableStr(r.thanh_phan_doan),
    qua_tang: nullableStr(r.qua_tang),
    tien_do: String(r.tien_do ?? TIEN_DO_DEFAULT) as TienDoThamHoi,
    ket_qua_thuc_hien: nullableStr(r.ket_qua_thuc_hien),
    link_ket_qua: nullableStr(r.link_ket_qua),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
  };
}

async function buildPayload(data: ThamHoiToChucFormValues): Promise<Record<string, unknown>> {
  const dipTen = await getDipTenById(data.dip_tham_hoi_id);
  if (!dipTen?.trim()) {
    throw new Error(txt('danTocThamHoiToChuc.validation.dipThamHoiInvalid'));
  }
  return thamHoiToChucPayload(data, dipTen);
}

/**
 * Dựng payload ghi DB — đồng bộ, không gọi mạng. Tên dịp (`dip_tham_hoi`) do
 * nơi gọi tra sẵn: form tra từng lần, nhập file tra một lần cho cả file.
 */
export function thamHoiToChucPayload(data: ThamHoiToChucFormValues, dipTen: string): Record<string, unknown> {
  return {
    to_chuc_id: Number(data.to_chuc_id),
    dip_tham_hoi_id: Number(data.dip_tham_hoi_id),
    dip_tham_hoi: dipTen,
    thoi_gian_du_kien: data.thoi_gian_du_kien ?? null,
    thoi_gian_thuc_te: data.thoi_gian_thuc_te ?? null,
    don_vi_tham_hoi_id:
      data.don_vi_tham_hoi_id != null && data.don_vi_tham_hoi_id !== ''
        ? Number(data.don_vi_tham_hoi_id)
        : null,
    phong_ban_tham_muu_id:
      data.phong_ban_tham_muu_id != null && data.phong_ban_tham_muu_id !== ''
        ? Number(data.phong_ban_tham_muu_id)
        : null,
    noi_dung_tham_hoi: data.noi_dung_tham_hoi ?? null,
    thanh_phan_doan: data.thanh_phan_doan ?? null,
    qua_tang: data.qua_tang ?? null,
    tien_do: data.tien_do,
    ket_qua_thuc_hien: data.ket_qua_thuc_hien ?? null,
    link_ket_qua: data.link_ket_qua ?? null,
  };
}

export async function getThamHoiToChucList(): Promise<ThamHoiToChuc[]> {
  const list = await repo.getAll({ orderBy: 'tg_cap_nhat', ascending: false });
  return list.map((row) => flattenThamHoiToChucRow(row as unknown as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Phân trang phía máy chủ (RPC) — xem CLAUDE.md "Chọn kiểu phân trang"
// ---------------------------------------------------------------------------

/** Cột được RPC sắp xếp; phải khớp khối ORDER BY trong migration. */
export const THAM_HOI_TO_CHUC_SERVER_SORT_COLUMNS = [
  'ten_co_so',
  'dip_tham_hoi',
  'thoi_gian_du_kien',
  'don_vi_tham_hoi',
  'tien_do',
  'ket_qua_thuc_hien',
  'tg_cap_nhat',
] as const;

/** Nhãn "đơn vị thăm hỏi để trống" — xem ghi chú ở module thăm hỏi cá nhân. */
export function buildThamHoiToChucDisplayLabels(): Record<string, string> {
  return { don_vi_cqmttq: DON_VI_THAM_HOI_TINH_LABEL };
}

export type ThamHoiToChucPageQuery = {
  page: number;
  pageSize: number;
  search: string;
  sort?: ServerSortState | null;
  viewAll: boolean;
  viewerDonViId: string | null;
  tienDo: readonly string[];
  toChucIds: readonly string[];
  dipIds: readonly string[];
  /** Đơn vị thăm hỏi; chip "MTTQ Tỉnh" mang giá trị DON_VI_THAM_HOI_TINH_VALUE. */
  donViIds: readonly string[];
  phongBanIds: readonly string[];
  columnSearch: Record<string, string> | null;
};

export type ThamHoiToChucPageResult = {
  rows: ThamHoiToChuc[];
  hasNextPage: boolean;
  totalRecords: number;
};

function toNullableRpcId(v: string | null | undefined): number | null {
  if (v == null) return null;
  const t = String(v).trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function toRpcIdArray(list: readonly string[]): number[] | null {
  const out = list.map((x) => Number(String(x).trim())).filter((n) => Number.isFinite(n));
  return out.length > 0 ? out : null;
}

function toRpcTextArray(list: readonly string[]): string[] | null {
  return list.length > 0 ? [...list] : null;
}

function cleanRpcColumnSearch(
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

/** RPC trả dòng phẳng — dựng lại hình dạng embed để dùng chung flatten. */
function rpcRowToThamHoiToChuc(raw: Record<string, unknown>): ThamHoiToChuc {
  const {
    ten_co_so,
    loai_hinh,
    ten_dip_tham_hoi,
    ten_don_vi_tham_hoi,
    ten_phong_ban,
    ho_va_ten_nguoi_tao,
    ten_tai_khoan_nguoi_tao,
    total_count: _totalCount,
    ...base
  } = raw;
  return flattenThamHoiToChucRow({
    ...base,
    to_chuc: { ten_co_so, loai_hinh },
    dip: { ten_dip: ten_dip_tham_hoi },
    don_vi_tham_hoi: { ten: ten_don_vi_tham_hoi },
    phong_ban: { ten_phong_ban },
    nguoi_tao: { ho_va_ten: ho_va_ten_nguoi_tao, ten_tai_khoan: ten_tai_khoan_nguoi_tao },
  });
}

export async function getThamHoiToChucPage(
  q: ThamHoiToChucPageQuery,
): Promise<ThamHoiToChucPageResult> {
  const supabase = getSupabase();
  if (!supabase) return { rows: [], hasNextPage: false, totalRecords: 0 };
  const pageSize = Math.max(1, Math.min(Math.floor(q.pageSize), 500));
  const page = Math.max(1, Math.floor(q.page));
  const offset = (page - 1) * pageSize;
  const search = q.search?.trim() ?? '';

  const { data, error } = await supabase.rpc('get_dttg_tham_hoi_to_chuc_page', {
    p_search: search.length > 0 ? search : null,
    p_limit: pageSize,
    p_offset: offset,
    p_sort: buildRpcSortParam(q.sort, THAM_HOI_TO_CHUC_SERVER_SORT_COLUMNS),
    p_view_all: q.viewAll,
    p_viewer_don_vi_id: toNullableRpcId(q.viewerDonViId),
    p_tien_do: toRpcTextArray(q.tienDo),
    p_to_chuc_ids: toRpcIdArray(q.toChucIds),
    p_dip_ids: toRpcIdArray(q.dipIds),
    p_don_vi_ids: toRpcIdArray(q.donViIds.filter((x) => x !== DON_VI_THAM_HOI_TINH_VALUE)),
    p_don_vi_include_null: q.donViIds.includes(DON_VI_THAM_HOI_TINH_VALUE),
    p_phong_ban_ids: toRpcIdArray(q.phongBanIds),
    p_column_search: cleanRpcColumnSearch(q.columnSearch),
    p_labels: buildThamHoiToChucDisplayLabels(),
  } as never);
  if (error) handleSupabaseError(error);

  const raw = (data ?? []) as unknown as Record<string, unknown>[];
  const rows = raw.map(rpcRowToThamHoiToChuc);
  const totalFromPage = readRpcTotalCount(raw);
  const totalRecords =
    totalFromPage ??
    (offset > 0 ? (await getThamHoiToChucPage({ ...q, page: 1, pageSize: 1 })).totalRecords : 0);
  return { rows, hasNextPage: offset + rows.length < totalRecords, totalRecords };
}

/** Kéo toàn bộ bản ghi khớp bộ lọc để xuất file. */
export function getThamHoiToChucAllForExport(
  q: Omit<ThamHoiToChucPageQuery, 'page' | 'pageSize'>,
): Promise<ThamHoiToChuc[]> {
  return fetchAllServerPages(q, getThamHoiToChucPage);
}

export async function getThamHoiToChucById(id: string): Promise<ThamHoiToChuc | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('dttg_tham_hoi_to_chuc')
    .select(DTTG_THAM_HOI_TO_CHUC_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenThamHoiToChucRow(data as unknown as Record<string, unknown>);
}

export async function getThamHoiToChucByToChucId(toChucId: string): Promise<ThamHoiToChuc[]> {
  const trimmed = toChucId.trim();
  if (!trimmed) return [];
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('dttg_tham_hoi_to_chuc')
    .select(DTTG_THAM_HOI_TO_CHUC_SELECT)
    .eq('to_chuc_id', trimmed)
    .order('tg_cap_nhat', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data ?? []).map((row) => flattenThamHoiToChucRow(row as unknown as Record<string, unknown>));
}

export async function getThamHoiToChucByDipId(dipId: string): Promise<ThamHoiToChuc[]> {
  const trimmed = dipId.trim();
  if (!trimmed) return [];
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('dttg_tham_hoi_to_chuc')
    .select(DTTG_THAM_HOI_TO_CHUC_SELECT)
    .eq('dip_tham_hoi_id', trimmed)
    .order('tg_cap_nhat', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data ?? []).map((row) => flattenThamHoiToChucRow(row as unknown as Record<string, unknown>));
}

export async function createThamHoiToChuc(
  data: ThamHoiToChucFormValues,
  idNguoiTao: string,
): Promise<ThamHoiToChuc> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('danTocThamHoiToChuc.service.noEmployeeProfile'));

  const inserted = await repo.insert(
    { ...(await buildPayload(data)), id_nguoi_tao: Number(trimmed) },
    { returningSelect: DTTG_THAM_HOI_TO_CHUC_RETURNING },
  );
  return flattenThamHoiToChucRow(inserted as unknown as Record<string, unknown>);
}

export async function updateThamHoiToChuc(id: string, data: ThamHoiToChucFormValues): Promise<ThamHoiToChuc> {
  const updated = await repo.update(id, (await buildPayload(data)) as unknown as Partial<RepoRow>, {
    returningSelect: DTTG_THAM_HOI_TO_CHUC_RETURNING,
  });
  return flattenThamHoiToChucRow(updated as unknown as Record<string, unknown>);
}

export async function updateThamHoiToChucTienDo(
  id: string,
  tienDo: TienDoThamHoi,
  thoiGianThucTe?: string | null,
): Promise<ThamHoiToChuc> {
  const patch: Record<string, unknown> = { tien_do: tienDo };
  if (tienDo === 'Đã hoàn thành') {
    patch.thoi_gian_thuc_te = thoiGianThucTe?.trim() || new Date().toISOString().slice(0, 10);
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error(txt('danTocThamHoiToChuc.service.notFound'));
  const { data, error } = await supabase
    .from('dttg_tham_hoi_to_chuc')
    .update(patch)
    .eq('id', id)
    .select(DTTG_THAM_HOI_TO_CHUC_RETURNING)
    .single();
  if (error) handleSupabaseError(error);
  return flattenThamHoiToChucRow(data as unknown as Record<string, unknown>);
}

export async function deleteThamHoiToChucMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await repo.remove(ids);
}

/** Thêm mới từ file nhập — chỉ trả `id`, không kéo embed về cho từng dòng. */
export async function insertThamHoiToChucFromImport(
  payload: Record<string, unknown>,
  idNguoiTao: string,
): Promise<void> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('danTocThamHoiToChuc.service.noEmployeeProfile'));
  await repo.insert({ ...payload, id_nguoi_tao: Number(trimmed) }, { returningSelect: 'id' });
}

/**
 * Ghi đè từ file nhập: chỉ các cột có trong file (payload đã qua `pickMappedColumns`).
 * Không kéo lại bản ghi đầy đủ sau khi ghi — trả `id` là đủ.
 */
export async function updateThamHoiToChucPartial(
  id: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await repo.update(
    id,
    { ...payload, tg_cap_nhat: new Date().toISOString() } as unknown as Partial<RepoRow>,
    { returningSelect: 'id' },
  );
}

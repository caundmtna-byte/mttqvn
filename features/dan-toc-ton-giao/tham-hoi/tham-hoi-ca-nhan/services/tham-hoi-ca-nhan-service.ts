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
import { getDipTenById } from '@/features/dan-toc-ton-giao/tham-hoi/dip-tham-hoi/services/dip-tham-hoi-service';
import { getThongTinCaNhanTieuBieuList } from '@/features/dan-toc-ton-giao/thong-tin/thong-tin-ca-nhan-tieu-bieu/services/thong-tin-ca-nhan-tieu-bieu-service';
import type { ThamHoiCaNhanFormValues } from '../core/schema';
import type { ThamHoiCaNhan } from '../core/types';
import type { TrangThaiThamHoi } from '../core/constants';
import {
  DON_VI_THAM_HOI_CQMTTQ_LABEL,
  DON_VI_THAM_HOI_CQMTTQ_VALUE,
  TRANG_THAI_DEFAULT,
} from '../core/constants';
import {
  DTTG_THAM_HOI_CA_NHAN_RETURNING,
  DTTG_THAM_HOI_CA_NHAN_SELECT,
} from '../core/supabase-select';
import { monthYearToDbDate } from '../utils/thoi-gian-du-kien';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'dttg_tham_hoi_ca_nhan',
  select: DTTG_THAM_HOI_CA_NHAN_SELECT,
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

function nullableDateIso(v: unknown): string | null {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

export function flattenThamHoiCaNhanRow(row: Record<string, unknown>): ThamHoiCaNhan {
  const cn = pickEmbedded<{ ho_va_ten?: string; doi_tuong?: string; chuc_vu_vi_tri?: string }>(row.ca_nhan);
  const pb = pickEmbedded<{ ten_phong_ban?: string }>(row.phong_ban);
  const dv = pickEmbedded<{ ten?: string }>(row.don_vi_tham_hoi);
  const dip = pickEmbedded<{ ten_dip?: string }>(row.dip);
  const xp = pickEmbedded<{ ten?: string }>(row.xa_phuong);
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const rest = { ...row };
  delete rest.ca_nhan;
  delete rest.phong_ban;
  delete rest.don_vi_tham_hoi;
  delete rest.dip;
  delete rest.xa_phuong;
  delete rest.nguoi_tao;
  const r = rest as Record<string, unknown>;

  const tenDip =
    dip?.ten_dip != null && String(dip.ten_dip).trim() !== ''
      ? String(dip.ten_dip)
      : String(r.dip_tham_hoi ?? '');

  return {
    id: String(r.id ?? ''),
    ca_nhan_id: String(r.ca_nhan_id ?? ''),
    ho_va_ten: cn?.ho_va_ten != null && String(cn.ho_va_ten).trim() !== '' ? String(cn.ho_va_ten) : null,
    doi_tuong:
      (r.doi_tuong != null && String(r.doi_tuong).trim() !== '' ? String(r.doi_tuong) : null) ??
      (cn?.doi_tuong != null && String(cn.doi_tuong).trim() !== '' ? String(cn.doi_tuong) : null),
    chuc_vu_vi_tri:
      (r.chuc_vu_vi_tri != null && String(r.chuc_vu_vi_tri).trim() !== ''
        ? String(r.chuc_vu_vi_tri)
        : null) ??
      (cn?.chuc_vu_vi_tri != null && String(cn.chuc_vu_vi_tri).trim() !== '' ? String(cn.chuc_vu_vi_tri) : null),
    phong_ban_tham_muu_id:
      r.phong_ban_tham_muu_id == null || r.phong_ban_tham_muu_id === ''
        ? null
        : String(r.phong_ban_tham_muu_id),
    ten_phong_ban:
      pb?.ten_phong_ban != null && String(pb.ten_phong_ban).trim() !== '' ? String(pb.ten_phong_ban) : null,
    dip_tham_hoi_id: String(r.dip_tham_hoi_id ?? ''),
    dip_tham_hoi: tenDip,
    ten_dip_tham_hoi: dip?.ten_dip != null && String(dip.ten_dip).trim() !== '' ? String(dip.ten_dip) : null,
    thoi_gian_du_kien: nullableDateIso(r.thoi_gian_du_kien),
    thoi_gian_thuc_te: nullableDateIso(r.thoi_gian_thuc_te),
    don_vi_tham_hoi_id:
      r.don_vi_tham_hoi_id == null || r.don_vi_tham_hoi_id === '' ? null : String(r.don_vi_tham_hoi_id),
    ten_don_vi_tham_hoi: dv?.ten != null && String(dv.ten).trim() !== '' ? String(dv.ten) : null,
    qua_tang: nullableStr(r.qua_tang),
    xa_phuong_id: r.xa_phuong_id == null || r.xa_phuong_id === '' ? null : String(r.xa_phuong_id),
    ten_xa_phuong: xp?.ten != null && String(xp.ten).trim() !== '' ? String(xp.ten) : null,
    trang_thai: String(r.trang_thai ?? TRANG_THAI_DEFAULT) as TrangThaiThamHoi,
    ket_qua_ghi_chu: nullableStr(r.ket_qua_ghi_chu),
    link_ket_qua: nullableStr(r.link_ket_qua),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
  };
}

async function denormFromCaNhan(caNhanId: string): Promise<{ doi_tuong: string | null; chuc_vu_vi_tri: string | null }> {
  const list = await getThongTinCaNhanTieuBieuList();
  const cn = list.find((c) => c.id === caNhanId);
  return {
    doi_tuong: cn?.doi_tuong ?? null,
    chuc_vu_vi_tri: cn?.chuc_vu_vi_tri ?? null,
  };
}

async function buildPayload(
  data: ThamHoiCaNhanFormValues,
  denorm?: ThamHoiCaNhanDenorm,
): Promise<Record<string, unknown>> {
  const dipTen = await getDipTenById(data.dip_tham_hoi_id);
  if (!dipTen?.trim()) {
    throw new Error(txt('danTocThamHoiCaNhan.validation.dipThamHoiInvalid'));
  }
  return thamHoiCaNhanPayload(data, denorm, dipTen);
}

/** Cột sao từ hồ sơ cá nhân tiêu biểu tại thời điểm lưu. */
export type ThamHoiCaNhanDenorm = { doi_tuong: string | null; chuc_vu_vi_tri: string | null };

/**
 * Dựng payload ghi DB — đồng bộ, không gọi mạng. Tên dịp (`dip_tham_hoi`) và
 * cột sao từ cá nhân do nơi gọi tra sẵn: form tra từng lần, nhập file tra một
 * lần cho cả file.
 */
export function thamHoiCaNhanPayload(
  data: ThamHoiCaNhanFormValues,
  denorm: ThamHoiCaNhanDenorm | undefined,
  dipTen: string,
): Record<string, unknown> {
  const thoiGianDb =
    data.thoi_gian_du_kien != null && data.thoi_gian_du_kien !== ''
      ? monthYearToDbDate(data.thoi_gian_du_kien)
      : null;

  return {
    ca_nhan_id: Number(data.ca_nhan_id),
    phong_ban_tham_muu_id:
      data.phong_ban_tham_muu_id != null && data.phong_ban_tham_muu_id !== ''
        ? Number(data.phong_ban_tham_muu_id)
        : null,
    doi_tuong: denorm?.doi_tuong ?? null,
    chuc_vu_vi_tri: denorm?.chuc_vu_vi_tri ?? null,
    dip_tham_hoi_id: Number(data.dip_tham_hoi_id),
    dip_tham_hoi: dipTen,
    thoi_gian_du_kien: thoiGianDb,
    thoi_gian_thuc_te: data.thoi_gian_thuc_te ?? null,
    don_vi_tham_hoi_id:
      data.don_vi_tham_hoi_id != null && data.don_vi_tham_hoi_id !== ''
        ? Number(data.don_vi_tham_hoi_id)
        : null,
    qua_tang: data.qua_tang ?? null,
    xa_phuong_id:
      data.xa_phuong_id != null && data.xa_phuong_id !== '' ? Number(data.xa_phuong_id) : null,
    trang_thai: data.trang_thai,
    ket_qua_ghi_chu: data.ket_qua_ghi_chu ?? null,
    link_ket_qua: data.link_ket_qua ?? null,
  };
}

export async function getThamHoiCaNhanList(): Promise<ThamHoiCaNhan[]> {
  const list = await repo.getAll({ orderBy: 'tg_cap_nhat', ascending: false });
  return list.map((row) => flattenThamHoiCaNhanRow(row as unknown as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Phân trang phía máy chủ (RPC) — xem CLAUDE.md "Chọn kiểu phân trang"
// ---------------------------------------------------------------------------

/** Cột được RPC sắp xếp; phải khớp khối ORDER BY trong migration. */
export const THAM_HOI_CA_NHAN_SERVER_SORT_COLUMNS = [
  'ho_va_ten',
  'dip_tham_hoi',
  'thoi_gian_du_kien',
  'don_vi_tham_hoi',
  'ten_phong_ban',
  'ten_xa_phuong',
  'trang_thai',
  'ket_qua_ghi_chu',
  'tg_cap_nhat',
] as const;

/**
 * Nhãn hiển thị gửi kèm xuống RPC.
 *
 * Cột "Đơn vị thăm hỏi" để trống nghĩa là cơ quan MTTQ tỉnh — đó là chuỗi được
 * tính ra, không có trong bảng. Muốn sắp xếp / tìm theo cột đúng như người dùng
 * nhìn thấy thì SQL phải dựng lại đúng chuỗi đó, nên truyền nhãn xuống thay vì
 * chép cứng câu chữ vào SQL.
 */
export function buildThamHoiCaNhanDisplayLabels(): Record<string, string> {
  return { don_vi_cqmttq: DON_VI_THAM_HOI_CQMTTQ_LABEL };
}

export type ThamHoiCaNhanPageQuery = {
  page: number;
  pageSize: number;
  search: string;
  sort?: ServerSortState | null;
  /** Phạm vi xem — suy từ useDttgViewer. */
  viewAll: boolean;
  viewerDonViId: string | null;
  trangThai: readonly string[];
  caNhanIds: readonly string[];
  phongBanIds: readonly string[];
  xaPhuongIds: readonly string[];
  dipIds: readonly string[];
  /** Đơn vị thăm hỏi; chip "Cơ quan MTTQ tỉnh" mang giá trị DON_VI_THAM_HOI_CQMTTQ_VALUE. */
  donViThamHoiIds: readonly string[];
  columnSearch: Record<string, string> | null;
};

export type ThamHoiCaNhanPageResult = {
  rows: ThamHoiCaNhan[];
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

/** Bỏ ô trống để RPC không phải lọc theo chuỗi rỗng; rỗng hết ⇒ null. */
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
function rpcRowToThamHoiCaNhan(raw: Record<string, unknown>): ThamHoiCaNhan {
  const {
    ho_va_ten,
    ten_phong_ban,
    ten_dip_tham_hoi,
    ten_don_vi_tham_hoi,
    ten_xa_phuong,
    ho_va_ten_nguoi_tao,
    ten_tai_khoan_nguoi_tao,
    total_count: _totalCount,
    ...base
  } = raw;
  return flattenThamHoiCaNhanRow({
    ...base,
    ca_nhan: { ho_va_ten },
    phong_ban: { ten_phong_ban },
    dip: { ten_dip: ten_dip_tham_hoi },
    don_vi_tham_hoi: { ten: ten_don_vi_tham_hoi },
    xa_phuong: { ten: ten_xa_phuong },
    nguoi_tao: { ho_va_ten: ho_va_ten_nguoi_tao, ten_tai_khoan: ten_tai_khoan_nguoi_tao },
  });
}

export async function getThamHoiCaNhanPage(
  q: ThamHoiCaNhanPageQuery,
): Promise<ThamHoiCaNhanPageResult> {
  const supabase = getSupabase();
  if (!supabase) return { rows: [], hasNextPage: false, totalRecords: 0 };
  const pageSize = Math.max(1, Math.min(Math.floor(q.pageSize), 500));
  const page = Math.max(1, Math.floor(q.page));
  const offset = (page - 1) * pageSize;
  const search = q.search?.trim() ?? '';

  const { data, error } = await supabase.rpc('get_dttg_tham_hoi_ca_nhan_page', {
    p_search: search.length > 0 ? search : null,
    p_limit: pageSize,
    p_offset: offset,
    p_sort: buildRpcSortParam(q.sort, THAM_HOI_CA_NHAN_SERVER_SORT_COLUMNS),
    p_view_all: q.viewAll,
    p_viewer_don_vi_id: toNullableRpcId(q.viewerDonViId),
    p_trang_thai: toRpcTextArray(q.trangThai),
    p_ca_nhan_ids: toRpcIdArray(q.caNhanIds),
    p_phong_ban_ids: toRpcIdArray(q.phongBanIds),
    p_xa_phuong_ids: toRpcIdArray(q.xaPhuongIds),
    p_dip_ids: toRpcIdArray(q.dipIds),
    p_don_vi_ids: toRpcIdArray(q.donViThamHoiIds.filter((x) => x !== DON_VI_THAM_HOI_CQMTTQ_VALUE)),
    p_don_vi_include_null: q.donViThamHoiIds.includes(DON_VI_THAM_HOI_CQMTTQ_VALUE),
    p_column_search: cleanRpcColumnSearch(q.columnSearch),
    p_labels: buildThamHoiCaNhanDisplayLabels(),
  } as never);
  if (error) handleSupabaseError(error);

  const raw = (data ?? []) as unknown as Record<string, unknown>[];
  const rows = raw.map(rpcRowToThamHoiCaNhan);
  const totalFromPage = readRpcTotalCount(raw);
  // Trang rỗng ngoài trang 1 không mang được tổng ⇒ hỏi lại trang đầu.
  const totalRecords =
    totalFromPage ??
    (offset > 0 ? (await getThamHoiCaNhanPage({ ...q, page: 1, pageSize: 1 })).totalRecords : 0);
  return { rows, hasNextPage: offset + rows.length < totalRecords, totalRecords };
}

/** Kéo toàn bộ bản ghi khớp bộ lọc để xuất file. */
export function getThamHoiCaNhanAllForExport(
  q: Omit<ThamHoiCaNhanPageQuery, 'page' | 'pageSize'>,
): Promise<ThamHoiCaNhan[]> {
  return fetchAllServerPages(q, getThamHoiCaNhanPage);
}

export async function getThamHoiCaNhanById(id: string): Promise<ThamHoiCaNhan | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('dttg_tham_hoi_ca_nhan')
    .select(DTTG_THAM_HOI_CA_NHAN_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenThamHoiCaNhanRow(data as unknown as Record<string, unknown>);
}

export async function getThamHoiCaNhanByCaNhanId(caNhanId: string): Promise<ThamHoiCaNhan[]> {
  const trimmed = caNhanId.trim();
  if (!trimmed) return [];
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('dttg_tham_hoi_ca_nhan')
    .select(DTTG_THAM_HOI_CA_NHAN_SELECT)
    .eq('ca_nhan_id', trimmed)
    .order('tg_cap_nhat', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data ?? []).map((row) => flattenThamHoiCaNhanRow(row as unknown as Record<string, unknown>));
}

export async function getThamHoiCaNhanByDipId(dipId: string): Promise<ThamHoiCaNhan[]> {
  const trimmed = dipId.trim();
  if (!trimmed) return [];
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('dttg_tham_hoi_ca_nhan')
    .select(DTTG_THAM_HOI_CA_NHAN_SELECT)
    .eq('dip_tham_hoi_id', trimmed)
    .order('tg_cap_nhat', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data ?? []).map((row) => flattenThamHoiCaNhanRow(row as unknown as Record<string, unknown>));
}

export async function createThamHoiCaNhan(
  data: ThamHoiCaNhanFormValues,
  idNguoiTao: string,
): Promise<ThamHoiCaNhan> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('danTocThamHoiCaNhan.service.noEmployeeProfile'));
  const denorm = await denormFromCaNhan(data.ca_nhan_id);

  const inserted = await repo.insert(
    { ...(await buildPayload(data, denorm)), id_nguoi_tao: Number(trimmed) },
    { returningSelect: DTTG_THAM_HOI_CA_NHAN_RETURNING },
  );
  return flattenThamHoiCaNhanRow(inserted as unknown as Record<string, unknown>);
}

export async function updateThamHoiCaNhan(id: string, data: ThamHoiCaNhanFormValues): Promise<ThamHoiCaNhan> {
  const denorm = await denormFromCaNhan(data.ca_nhan_id);

  const updated = await repo.update(id, (await buildPayload(data, denorm)) as unknown as Partial<RepoRow>, {
    returningSelect: DTTG_THAM_HOI_CA_NHAN_RETURNING,
  });
  return flattenThamHoiCaNhanRow(updated as unknown as Record<string, unknown>);
}

export async function updateThamHoiCaNhanTrangThai(
  id: string,
  trangThai: TrangThaiThamHoi,
  thoiGianThucTe?: string | null,
): Promise<ThamHoiCaNhan> {
  const patch: Record<string, unknown> = { trang_thai: trangThai };
  if (trangThai === 'Đã hoàn thành') {
    patch.thoi_gian_thuc_te = thoiGianThucTe?.trim() || new Date().toISOString().slice(0, 10);
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error(txt('danTocThamHoiCaNhan.service.notFound'));
  const { data, error } = await supabase
    .from('dttg_tham_hoi_ca_nhan')
    .update(patch)
    .eq('id', id)
    .select(DTTG_THAM_HOI_CA_NHAN_RETURNING)
    .single();
  if (error) handleSupabaseError(error);
  return flattenThamHoiCaNhanRow(data as unknown as Record<string, unknown>);
}

export async function deleteThamHoiCaNhanMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await repo.remove(ids);
}

/** Thêm mới từ file nhập — chỉ trả `id`, không kéo embed về cho từng dòng. */
export async function insertThamHoiCaNhanFromImport(
  payload: Record<string, unknown>,
  idNguoiTao: string,
): Promise<void> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('danTocThamHoiCaNhan.service.noEmployeeProfile'));
  await repo.insert({ ...payload, id_nguoi_tao: Number(trimmed) }, { returningSelect: 'id' });
}

/**
 * Ghi đè từ file nhập: chỉ các cột có trong file (payload đã qua `pickMappedColumns`).
 * Không kéo lại bản ghi đầy đủ sau khi ghi — trả `id` là đủ.
 */
export async function updateThamHoiCaNhanPartial(
  id: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await repo.update(
    id,
    { ...payload, tg_cap_nhat: new Date().toISOString() } as unknown as Partial<RepoRow>,
    { returningSelect: 'id' },
  );
}

export { DON_VI_THAM_HOI_CQMTTQ_LABEL };

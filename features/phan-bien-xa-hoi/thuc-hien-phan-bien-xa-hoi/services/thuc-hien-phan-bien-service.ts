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
import type { ThucHienPhanBienFormValues } from '../core/schema';
import type { ThucHienPhanBien } from '../core/types';
import type { CapThucHien, LoaiHinh, TinhTrang } from '../core/constants';
import { TINH_TRANG_DEFAULT } from '../core/constants';
import { PBXH_THUC_HIEN_RETURNING, PBXH_THUC_HIEN_SELECT } from '../core/supabase-select';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'pbxh_thuc_hien_phan_bien_xa_hoi',
  select: PBXH_THUC_HIEN_SELECT,
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

export function flattenThucHienPhanBienRow(row: Record<string, unknown>): ThucHienPhanBien {
  const dt = pickEmbedded<{ ten?: string }>(row.doi_tuong);
  const dvc = pickEmbedded<{ ten?: string }>(row.don_vi_chu_tri);
  const ht = pickEmbedded<{ ten?: string }>(row.hinh_thuc);
  const pb = pickEmbedded<{ ten_phong_ban?: string }>(row.phong_ban);
  const dv = pickEmbedded<{ ten?: string }>(row.don_vi_thuc_hien);
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const rest = { ...row };
  delete rest.doi_tuong;
  delete rest.don_vi_chu_tri;
  delete rest.hinh_thuc;
  delete rest.phong_ban;
  delete rest.don_vi_thuc_hien;
  delete rest.nguoi_tao;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id ?? ''),
    cap_thuc_hien: String(r.cap_thuc_hien ?? '') as CapThucHien,
    loai_hinh: String(r.loai_hinh ?? '') as LoaiHinh,
    noi_dung: String(r.noi_dung ?? ''),
    doi_tuong_id: nullableStr(r.doi_tuong_id),
    ten_doi_tuong: dt?.ten != null && String(dt.ten).trim() !== '' ? String(dt.ten) : null,
    hinh_thuc_id: nullableStr(r.hinh_thuc_id),
    ten_hinh_thuc: ht?.ten != null && String(ht.ten).trim() !== '' ? String(ht.ten) : null,
    ngay_bat_dau: nullableStr(r.ngay_bat_dau),
    ngay_ket_thuc: nullableStr(r.ngay_ket_thuc),
    mo_ta_thoi_gian: nullableStr(r.mo_ta_thoi_gian),
    tinh_trang: String(r.tinh_trang ?? TINH_TRANG_DEFAULT) as TinhTrang,
    don_vi_chu_tri_id: nullableStr(r.don_vi_chu_tri_id),
    ten_don_vi_chu_tri: dvc?.ten != null && String(dvc.ten).trim() !== '' ? String(dvc.ten) : null,
    phong_ban_tham_muu_id: nullableStr(r.phong_ban_tham_muu_id),
    ten_phong_ban: pb?.ten_phong_ban != null && String(pb.ten_phong_ban).trim() !== '' ? String(pb.ten_phong_ban) : null,
    don_vi_thuc_hien_id: nullableStr(r.don_vi_thuc_hien_id),
    ten_don_vi_thuc_hien: dv?.ten != null && String(dv.ten).trim() !== '' ? String(dv.ten) : null,
    ket_qua_kien_nghi: nullableStr(r.ket_qua_kien_nghi),
    so_lan_hoan_thanh: Number(r.so_lan_hoan_thanh ?? 0),
    so_lan_khao_sat: Number(r.so_lan_khao_sat ?? 0),
    phan_tram_hoan_thanh: Number(r.phan_tram_hoan_thanh ?? 0),
    link_ket_qua: nullableStr(r.link_ket_qua),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
  };
}

function formToPayload(data: ThucHienPhanBienFormValues): Record<string, unknown> {
  return {
    cap_thuc_hien: data.cap_thuc_hien,
    loai_hinh: data.loai_hinh,
    noi_dung: data.noi_dung,
    doi_tuong_id: nullableFk(data.doi_tuong_id),
    hinh_thuc_id: nullableFk(data.hinh_thuc_id),
    ngay_bat_dau: data.ngay_bat_dau ?? null,
    ngay_ket_thuc: data.ngay_ket_thuc ?? null,
    mo_ta_thoi_gian: data.mo_ta_thoi_gian ?? null,
    tinh_trang: data.tinh_trang,
    don_vi_chu_tri_id: nullableFk(data.don_vi_chu_tri_id),
    phong_ban_tham_muu_id: nullableFk(data.phong_ban_tham_muu_id),
    don_vi_thuc_hien_id: nullableFk(data.don_vi_thuc_hien_id),
    ket_qua_kien_nghi: data.ket_qua_kien_nghi ?? null,
    so_lan_hoan_thanh: data.so_lan_hoan_thanh ?? 0,
    so_lan_khao_sat: data.so_lan_khao_sat ?? 0,
    link_ket_qua: data.link_ket_qua ?? null,
  };
}

export async function getThucHienPhanBienList(): Promise<ThucHienPhanBien[]> {
  const list = await repo.getAll({ orderBy: 'tg_cap_nhat', ascending: false });
  return list.map((row) => flattenThucHienPhanBienRow(row as unknown as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Phân trang phía máy chủ (RPC) — xem CLAUDE.md "Chọn kiểu phân trang"
// ---------------------------------------------------------------------------

/** Cột được RPC sắp xếp; phải khớp khối ORDER BY trong migration. */
export const PBXH_THUC_HIEN_SERVER_SORT_COLUMNS = [
  'loai_hinh',
  'cap_thuc_hien',
  'noi_dung',
  'tinh_trang',
  'don_vi_thuc_hien',
  'tien_do',
  'ten_don_vi_chu_tri',
  'ten_doi_tuong',
  'ten_hinh_thuc',
  'ten_phong_ban',
  'ket_qua_kien_nghi',
  'link_ket_qua',
  'mo_ta_thoi_gian',
  'ho_va_ten_nguoi_tao',
  'ngay_bat_dau',
  'ngay_ket_thuc',
  'so_lan_hoan_thanh',
  'so_lan_khao_sat',
  'phan_tram_hoan_thanh',
  'tg_cap_nhat',
] as const;

/**
 * Mẫu câu hiển thị gửi kèm xuống RPC.
 *
 * Hai cột "Tiến độ" và "Đơn vị thực hiện" là chuỗi được tính ra chứ không nằm
 * trong bảng; muốn sắp xếp / tìm theo cột đúng như người dùng nhìn thấy thì SQL
 * phải dựng lại y hệt chuỗi đó. Câu chữ vẫn chỉ có một nguồn là `lib/text`.
 */
export function buildPbxhDisplayLabels(): Record<string, string> {
  return {
    don_vi_tinh: txt('pbxhThucHien.store.donViThucHienTinhCap'),
    empty_cell: txt('common.emptyCell'),
    tien_do_con: txt('pbxhThucHien.tienDo.conNgay', { count: '{{count}}' }),
    tien_do_hom_nay: txt('pbxhThucHien.tienDo.hetHanHomNay'),
    tien_do_qua_han: txt('pbxhThucHien.tienDo.quaHan', { count: '{{count}}' }),
  };
}

export type PbxhThucHienPageQuery = {
  page: number;
  pageSize: number;
  search: string;
  sort?: ServerSortState | null;
  /** Phạm vi xem — suy từ usePbxhThucHienViewer. */
  viewAll: boolean;
  viewerDonViId: string | null;
  capThucHien: readonly string[];
  loaiHinh: readonly string[];
  tinhTrang: readonly string[];
  donViChuTriIds: readonly string[];
  columnSearch: Record<string, string> | null;
};

export type PbxhThucHienPageResult = {
  rows: ThucHienPhanBien[];
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
function cleanColumnSearch(cs: Record<string, string> | null | undefined): Record<string, string> | null {
  if (!cs) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(cs)) {
    const t = v?.trim();
    if (t) out[k] = t;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** RPC trả dòng phẳng — dựng lại hình dạng embed để dùng chung flatten. */
function rpcRowToThucHien(raw: Record<string, unknown>): ThucHienPhanBien {
  const {
    ten_doi_tuong,
    ten_hinh_thuc,
    ten_don_vi_chu_tri,
    ten_phong_ban,
    ten_don_vi_thuc_hien,
    ho_va_ten_nguoi_tao,
    ten_tai_khoan_nguoi_tao,
    total_count: _totalCount,
    ...base
  } = raw;
  return flattenThucHienPhanBienRow({
    ...base,
    doi_tuong: { ten: ten_doi_tuong },
    hinh_thuc: { ten: ten_hinh_thuc },
    don_vi_chu_tri: { ten: ten_don_vi_chu_tri },
    phong_ban: { ten_phong_ban },
    don_vi_thuc_hien: { ten: ten_don_vi_thuc_hien },
    nguoi_tao: { ho_va_ten: ho_va_ten_nguoi_tao, ten_tai_khoan: ten_tai_khoan_nguoi_tao },
  });
}

export async function getThucHienPhanBienPage(
  q: PbxhThucHienPageQuery,
): Promise<PbxhThucHienPageResult> {
  const supabase = getSupabase();
  if (!supabase) return { rows: [], hasNextPage: false, totalRecords: 0 };
  const pageSize = Math.max(1, Math.min(Math.floor(q.pageSize), 500));
  const page = Math.max(1, Math.floor(q.page));
  const offset = (page - 1) * pageSize;
  const search = q.search?.trim() ?? '';

  const { data, error } = await supabase.rpc('get_pbxh_thuc_hien_page', {
    p_search: search.length > 0 ? search : null,
    p_limit: pageSize,
    p_offset: offset,
    p_sort: buildRpcSortParam(q.sort, PBXH_THUC_HIEN_SERVER_SORT_COLUMNS),
    p_view_all: q.viewAll,
    p_viewer_don_vi_id: toNullableId(q.viewerDonViId),
    p_cap_thuc_hien: toTextArray(q.capThucHien),
    p_loai_hinh: toTextArray(q.loaiHinh),
    p_tinh_trang: toTextArray(q.tinhTrang),
    p_don_vi_chu_tri_ids: toIdArray(q.donViChuTriIds),
    p_column_search: cleanColumnSearch(q.columnSearch),
    p_labels: buildPbxhDisplayLabels(),
  } as never);
  if (error) handleSupabaseError(error);

  const raw = (data ?? []) as unknown as Record<string, unknown>[];
  const rows = raw.map(rpcRowToThucHien);
  const totalFromPage = readRpcTotalCount(raw);
  // Trang rỗng ngoài trang 1 không mang được tổng ⇒ hỏi lại trang đầu.
  const totalRecords =
    totalFromPage ??
    (offset > 0 ? (await getThucHienPhanBienPage({ ...q, page: 1, pageSize: 1 })).totalRecords : 0);
  return { rows, hasNextPage: offset + rows.length < totalRecords, totalRecords };
}

/** Kéo toàn bộ bản ghi khớp bộ lọc để xuất file. */
export function getThucHienPhanBienAllForExport(
  q: Omit<PbxhThucHienPageQuery, 'page' | 'pageSize'>,
): Promise<ThucHienPhanBien[]> {
  return fetchAllServerPages(q, getThucHienPhanBienPage);
}

export async function getThucHienPhanBienById(id: string): Promise<ThucHienPhanBien | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('pbxh_thuc_hien_phan_bien_xa_hoi')
    .select(PBXH_THUC_HIEN_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenThucHienPhanBienRow(data as unknown as Record<string, unknown>);
}

export async function createThucHienPhanBien(
  data: ThucHienPhanBienFormValues,
  idNguoiTao: string,
): Promise<ThucHienPhanBien> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('pbxhThucHien.service.noEmployeeProfile'));

  const inserted = await repo.insert(
    {
      ...formToPayload(data),
      id_nguoi_tao: Number(trimmed),
      tg_tao: new Date().toISOString(),
      tg_cap_nhat: new Date().toISOString(),
    },
    { returningSelect: PBXH_THUC_HIEN_RETURNING },
  );
  return flattenThucHienPhanBienRow(inserted as unknown as Record<string, unknown>);
}

export async function updateThucHienPhanBien(
  id: string,
  data: ThucHienPhanBienFormValues,
): Promise<ThucHienPhanBien> {
  const updated = await repo.update(
    id,
    {
      ...formToPayload(data),
      tg_cap_nhat: new Date().toISOString(),
    },
    { returningSelect: PBXH_THUC_HIEN_RETURNING },
  );
  return flattenThucHienPhanBienRow(updated as unknown as Record<string, unknown>);
}

export async function deleteThucHienPhanBienMany(ids: string[]): Promise<void> {
  await repo.remove(ids);
}

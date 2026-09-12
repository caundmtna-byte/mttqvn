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
import type { ImportErrorRow } from '@/components/shared/ImportDialog';
import { IMPORT_ROW_NUM_KEY } from '@/components/shared/ImportDialog';
import { getThongTinToChucQuanTrongList } from '@/features/dan-toc-ton-giao/thong-tin/thong-tin-to-chuc-quan-trong/services/thong-tin-to-chuc-quan-trong-service';
import { getDipTenById, getDipThamHoiList } from '@/features/dan-toc-ton-giao/tham-hoi/dip-tham-hoi/services/dip-tham-hoi-service';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import type { ThamHoiToChucFormValues } from '../core/schema';
import { thamHoiToChucSchema } from '../core/schema';
import type { ThamHoiToChuc } from '../core/types';
import type { TienDoThamHoi } from '../core/constants';
import { TIEN_DO_DEFAULT, TIEN_DO_VALUES } from '../core/constants';
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

async function resolveXaPhuongIdByTen(ten: string): Promise<string | null> {
  const t = ten.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  const all = await getXaPhuongAll();
  const exact = all.find((x) => x.ten.trim().toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = all.find(
    (x) => x.ten.toLowerCase().includes(lower) || lower.includes(x.ten.toLowerCase()),
  );
  return partial?.id ?? null;
}

function isMttqTinhLabel(raw: string): boolean {
  const lower = raw.trim().toLowerCase();
  return (
    lower === '' ||
    lower === 'mttq tỉnh' ||
    lower === 'mttq tinh' ||
    lower === 'cqmttq tỉnh' ||
    lower === 'cqmttq tinh'
  );
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

function importRowNum(raw: Record<string, unknown>, fallback: number): number {
  const n = raw[IMPORT_ROW_NUM_KEY];
  if (typeof n === 'number' && Number.isFinite(n)) return n;
  const parsed = Number(n);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveTienDoFromImport(raw: unknown): TienDoThamHoi {
  const s = String(raw ?? '').trim();
  if (!s) return TIEN_DO_DEFAULT;
  const exact = TIEN_DO_VALUES.find((v) => v === s);
  if (exact) return exact;
  const lower = s.toLowerCase();
  const match = TIEN_DO_VALUES.find((v) => v.toLowerCase() === lower);
  return match ?? TIEN_DO_DEFAULT;
}

async function resolveDipIdByTen(tenDip: string): Promise<string | null> {
  const t = tenDip.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  const all = await getDipThamHoiList();
  const exact = all.find((x) => x.ten_dip.trim().toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = all.find(
    (x) => x.ten_dip.toLowerCase().includes(lower) || lower.includes(x.ten_dip.toLowerCase()),
  );
  return partial?.id ?? null;
}

async function resolveToChucIdByTen(tenCoSo: string): Promise<string | null> {
  const t = tenCoSo.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  const all = await getThongTinToChucQuanTrongList();
  const exact = all.find((x) => x.ten_co_so.trim().toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = all.find(
    (x) =>
      x.ten_co_so.toLowerCase().includes(lower) || lower.includes(x.ten_co_so.toLowerCase()),
  );
  return partial?.id ?? null;
}

export async function importThamHoiToChuc(
  rows: Record<string, unknown>[],
  idNguoiTao: string,
): Promise<{ created: number; errors: string[]; errorRows: ImportErrorRow[] }> {
  const trimmedNv = idNguoiTao.trim();
  if (!trimmedNv) throw new Error(txt('danTocThamHoiToChuc.service.noEmployeeProfile'));

  const errors: string[] = [];
  const errorRows: ImportErrorRow[] = [];
  const validPayloads: Record<string, unknown>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = importRowNum(raw, i + 2);
    const rowData = { ...raw };
    delete rowData[IMPORT_ROW_NUM_KEY];

    const tcRaw =
      raw.to_chuc_id != null && String(raw.to_chuc_id).trim() !== '' ? String(raw.to_chuc_id).trim() : '';
    let to_chuc_id: string | null = null;
    if (tcRaw && /^\d+$/.test(tcRaw)) {
      to_chuc_id = tcRaw;
    } else {
      const tenCoSo = String(raw.ten_co_so ?? '').trim();
      if (tenCoSo) {
        to_chuc_id = (await resolveToChucIdByTen(tenCoSo)) ?? null;
        if (!to_chuc_id) {
          const msg = txt('danTocThamHoiToChuc.validation.toChucInvalid');
          const errMsg = txt('danTocThamHoiToChuc.import.rowError', { row: rowNum, message: msg });
          errors.push(errMsg);
          errorRows.push({ rowNum, data: rowData, message: errMsg });
          continue;
        }
      }
    }

    let don_vi_tham_hoi_id: string | undefined;
    const dvRaw =
      raw.don_vi_tham_hoi_id != null && String(raw.don_vi_tham_hoi_id).trim() !== ''
        ? String(raw.don_vi_tham_hoi_id).trim()
        : '';
    if (dvRaw && /^\d+$/.test(dvRaw)) {
      don_vi_tham_hoi_id = dvRaw;
    } else {
      const tenDv =
        String(raw.ten_don_vi_tham_hoi ?? raw.don_vi_tham_hoi ?? '').trim();
      if (tenDv && !isMttqTinhLabel(tenDv)) {
        const resolved = (await resolveXaPhuongIdByTen(tenDv)) ?? null;
        if (!resolved) {
          const msg = txt('danTocThamHoiToChuc.validation.donViThamHoiInvalid');
          const errMsg = txt('danTocThamHoiToChuc.import.rowError', { row: rowNum, message: msg });
          errors.push(errMsg);
          errorRows.push({ rowNum, data: rowData, message: errMsg });
          continue;
        }
        don_vi_tham_hoi_id = resolved;
      }
    }

    const dipRaw =
      raw.dip_tham_hoi_id != null && String(raw.dip_tham_hoi_id).trim() !== ''
        ? String(raw.dip_tham_hoi_id).trim()
        : '';
    let dip_tham_hoi_id: string | null = null;
    if (dipRaw && /^\d+$/.test(dipRaw)) {
      dip_tham_hoi_id = dipRaw;
    } else {
      const tenDip = String(raw.dip_tham_hoi ?? raw.ten_dip ?? '').trim();
      if (!tenDip) {
        const msg = txt('danTocThamHoiToChuc.validation.dipThamHoiRequired');
        const errMsg = txt('danTocThamHoiToChuc.import.rowError', { row: rowNum, message: msg });
        errors.push(errMsg);
        errorRows.push({ rowNum, data: rowData, message: errMsg });
        continue;
      }
      dip_tham_hoi_id = (await resolveDipIdByTen(tenDip)) ?? null;
      if (!dip_tham_hoi_id) {
        const msg = txt('danTocThamHoiToChuc.validation.dipThamHoiInvalid');
        const errMsg = txt('danTocThamHoiToChuc.import.rowError', { row: rowNum, message: msg });
        errors.push(errMsg);
        errorRows.push({ rowNum, data: rowData, message: errMsg });
        continue;
      }
    }

    const input = {
      to_chuc_id: to_chuc_id ?? '',
      dip_tham_hoi_id: dip_tham_hoi_id ?? '',
      thoi_gian_du_kien:
        raw.thoi_gian_du_kien != null && String(raw.thoi_gian_du_kien).trim() !== ''
          ? String(raw.thoi_gian_du_kien)
          : undefined,
      don_vi_tham_hoi_id,
      noi_dung_tham_hoi:
        raw.noi_dung_tham_hoi != null && String(raw.noi_dung_tham_hoi).trim() !== ''
          ? String(raw.noi_dung_tham_hoi)
          : undefined,
      thanh_phan_doan:
        raw.thanh_phan_doan != null && String(raw.thanh_phan_doan).trim() !== ''
          ? String(raw.thanh_phan_doan)
          : undefined,
      qua_tang:
        raw.qua_tang != null && String(raw.qua_tang).trim() !== '' ? String(raw.qua_tang) : undefined,
      tien_do: resolveTienDoFromImport(raw.tien_do),
      ket_qua_thuc_hien:
        raw.ket_qua_thuc_hien != null && String(raw.ket_qua_thuc_hien).trim() !== ''
          ? String(raw.ket_qua_thuc_hien)
          : undefined,
      link_ket_qua:
        raw.link_ket_qua != null && String(raw.link_ket_qua).trim() !== ''
          ? String(raw.link_ket_qua)
          : undefined,
    };

    const parsed = thamHoiToChucSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
      const errMsg = txt('danTocThamHoiToChuc.import.rowError', { row: rowNum, message: msg });
      errors.push(errMsg);
      errorRows.push({ rowNum, data: rowData, message: errMsg });
      continue;
    }
    validPayloads.push({ ...(await buildPayload(parsed.data)), id_nguoi_tao: Number(trimmedNv) });
  }

  if (validPayloads.length > 0) {
    const supabase = getSupabase();
    if (!supabase) throw new Error(txt('danTocThamHoiToChuc.service.notFound'));
    const { error } = await supabase.from('dttg_tham_hoi_to_chuc').insert(validPayloads);
    if (error) handleSupabaseError(error);
  }

  return { created: validPayloads.length, errors, errorRows };
}

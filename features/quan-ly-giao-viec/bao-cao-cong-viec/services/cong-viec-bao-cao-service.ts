import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type {
  TaskReportEnumCount,
  TaskReportFilterOptions,
  TaskReportKpi,
  TaskReportLookupRow,
  TaskReportLookupSort,
  TaskReportPersonRow,
  TaskReportRpcArgs,
  TaskReportTrendBucket,
  TaskReportTrendPoint,
} from '../core/types';
import type { CongViecMucDo, CongViecTrangThai } from '@/features/quan-ly-giao-viec/cong-viec/core/constants';

function getClient() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
}

function normPersonRow(raw: Record<string, unknown>): TaskReportPersonRow {
  return {
    id: String(raw.id_trach_nhiem ?? raw.id_nguoi_tao ?? ''),
    ho_va_ten: raw.ho_va_ten == null ? null : String(raw.ho_va_ten),
    ten_tai_khoan: raw.ten_tai_khoan == null ? null : String(raw.ten_tai_khoan),
    total: Number(raw.total ?? 0),
    hoan_thanh: Number(raw.hoan_thanh ?? 0),
    qua_han: Number(raw.qua_han ?? 0),
    dang: raw.dang == null ? undefined : Number(raw.dang),
    completion_rate:
      raw.completion_rate == null ? null : Number(raw.completion_rate),
  };
}

function normLookupRow(raw: Record<string, unknown>): TaskReportLookupRow {
  return {
    id: String(raw.id ?? ''),
    muc_do: raw.muc_do as CongViecMucDo,
    ten_cong_viec: String(raw.ten_cong_viec ?? ''),
    ghi_chu: raw.ghi_chu == null ? null : String(raw.ghi_chu),
    link_tai_lieu: raw.link_tai_lieu == null ? null : String(raw.link_tai_lieu),
    thoi_han: raw.thoi_han == null ? null : String(raw.thoi_han).slice(0, 10),
    tien_do: Number(raw.tien_do ?? 0),
    id_trach_nhiem: String(raw.id_trach_nhiem ?? ''),
    ids_ho_tro: Array.isArray(raw.ids_ho_tro) ? (raw.ids_ho_tro as unknown[]).map((x) => String(x)) : [],
    trang_thai: raw.trang_thai as CongViecTrangThai,
    ket_qua: raw.ket_qua == null ? null : String(raw.ket_qua),
    link_kq: raw.link_kq == null ? null : String(raw.link_kq),
    ngay_hoan_thanh: raw.ngay_hoan_thanh == null ? null : String(raw.ngay_hoan_thanh).slice(0, 10),
    id_nguoi_tao: String(raw.id_nguoi_tao ?? ''),
    id_chuong_trinh:
      raw.id_chuong_trinh == null || raw.id_chuong_trinh === '' ? null : String(raw.id_chuong_trinh),
    ten_chuong_trinh:
      raw.ten_chuong_trinh == null || raw.ten_chuong_trinh === '' ? null : String(raw.ten_chuong_trinh),
    tg_tao: String(raw.tg_tao ?? ''),
    tg_cap_nhat: String(raw.tg_cap_nhat ?? ''),
    ho_va_ten_trach_nhiem: raw.ho_va_ten_trach_nhiem == null ? null : String(raw.ho_va_ten_trach_nhiem),
    ten_tai_khoan_trach_nhiem:
      raw.ten_tai_khoan_trach_nhiem == null ? null : String(raw.ten_tai_khoan_trach_nhiem),
    ho_va_ten_nguoi_tao: raw.ho_va_ten_nguoi_tao == null ? null : String(raw.ho_va_ten_nguoi_tao),
    ten_tai_khoan_nguoi_tao:
      raw.ten_tai_khoan_nguoi_tao == null ? null : String(raw.ten_tai_khoan_nguoi_tao),
    days_to_deadline: raw.days_to_deadline == null ? null : Number(raw.days_to_deadline),
    total_count: Number(raw.total_count ?? 0),
  };
}

export async function getTaskReportKpi(args: TaskReportRpcArgs): Promise<TaskReportKpi> {
  const supabase = getClient();
  const { data, error } = await supabase.rpc('cong_viec_bao_cao_kpi', args as never);
  if (error) handleSupabaseError(error);
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  if (!row) {
    return {
      total: 0, moi: 0, dang: 0, hoan_thanh: 0, tam_dung: 0, huy: 0,
      qua_han: 0, sap_het_han: 0, hoan_thanh_dung_han: 0,
      distinct_trach_nhiem: 0, distinct_nguoi_tao: 0,
    };
  }
  return {
    total: Number(row.total ?? 0),
    moi: Number(row.moi ?? 0),
    dang: Number(row.dang ?? 0),
    hoan_thanh: Number(row.hoan_thanh ?? 0),
    tam_dung: Number(row.tam_dung ?? 0),
    huy: Number(row.huy ?? 0),
    qua_han: Number(row.qua_han ?? 0),
    sap_het_han: Number(row.sap_het_han ?? 0),
    hoan_thanh_dung_han: Number(row.hoan_thanh_dung_han ?? 0),
    distinct_trach_nhiem: Number(row.distinct_trach_nhiem ?? 0),
    distinct_nguoi_tao: Number(row.distinct_nguoi_tao ?? 0),
  };
}

export async function getTaskReportTrend(
  args: TaskReportRpcArgs,
  bucket: TaskReportTrendBucket = 'auto',
): Promise<TaskReportTrendPoint[]> {
  const supabase = getClient();
  const { data, error } = await supabase.rpc('cong_viec_bao_cao_trend', {
    ...args,
    p_bucket: bucket,
  } as never);
  if (error) handleSupabaseError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    bucket_key: String(r.bucket_key ?? ''),
    label: String(r.label ?? ''),
    created: Number(r.created ?? 0),
    done: Number(r.done ?? 0),
    overdue: Number(r.overdue ?? 0),
  }));
}

export async function getTaskReportPhanBoTrangThai(
  args: TaskReportRpcArgs,
): Promise<TaskReportEnumCount<CongViecTrangThai>[]> {
  const supabase = getClient();
  const { data, error } = await supabase.rpc('cong_viec_bao_cao_phan_bo_trang_thai', args as never);
  if (error) handleSupabaseError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    value: r.trang_thai as CongViecTrangThai,
    count: Number(r.count ?? 0),
  }));
}

export async function getTaskReportPhanBoMucDo(
  args: TaskReportRpcArgs,
): Promise<TaskReportEnumCount<CongViecMucDo>[]> {
  const supabase = getClient();
  const { data, error } = await supabase.rpc('cong_viec_bao_cao_phan_bo_muc_do', args as never);
  if (error) handleSupabaseError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    value: r.muc_do as CongViecMucDo,
    count: Number(r.count ?? 0),
  }));
}

export async function getTaskReportTopTrachNhiem(
  args: TaskReportRpcArgs,
  topN = 10,
): Promise<TaskReportPersonRow[]> {
  const supabase = getClient();
  const { data, error } = await supabase.rpc('cong_viec_bao_cao_top_trach_nhiem', {
    ...args,
    p_top: topN,
  } as never);
  if (error) handleSupabaseError(error);
  return ((data ?? []) as Record<string, unknown>[]).map(normPersonRow);
}

export async function getTaskReportTopNguoiTao(
  args: TaskReportRpcArgs,
  topN = 10,
): Promise<TaskReportPersonRow[]> {
  const supabase = getClient();
  const { data, error } = await supabase.rpc('cong_viec_bao_cao_top_nguoi_tao', {
    ...args,
    p_top: topN,
  } as never);
  if (error) handleSupabaseError(error);
  return ((data ?? []) as Record<string, unknown>[]).map(normPersonRow);
}

export async function getTaskReportLookup(
  args: TaskReportRpcArgs,
  options: { limit: number; offset: number; sort: TaskReportLookupSort },
): Promise<{ rows: TaskReportLookupRow[]; total: number }> {
  const supabase = getClient();
  const { data, error } = await supabase.rpc('cong_viec_bao_cao_lookup', {
    ...args,
    p_limit: options.limit,
    p_offset: options.offset,
    p_sort: options.sort,
  } as never);
  if (error) handleSupabaseError(error);
  const rawRows = (data ?? []) as Record<string, unknown>[];
  const rows = rawRows.map(normLookupRow);
  const total = rows.length > 0 ? rows[0].total_count : 0;
  return { rows, total };
}

export async function getTaskReportFilterOptions(args: {
  p_start: string;
  p_end: string;
  p_viewer_id: number | null;
  p_viewer_phong_ban_id: number | null;
  p_view_all: boolean;
}): Promise<TaskReportFilterOptions> {
  const supabase = getClient();
  const { data, error } = await supabase.rpc('cong_viec_bao_cao_filter_options', args as never);
  if (error) handleSupabaseError(error);
  const row = (Array.isArray(data) ? data[0] : data) as
    | { trach_nhiem?: unknown; nguoi_tao?: unknown }
    | undefined;
  const norm = (val: unknown) =>
    Array.isArray(val)
      ? (val as Record<string, unknown>[]).map((o) => ({
          id: String(o.id ?? ''),
          label: String(o.label ?? ''),
          count: Number(o.count ?? 0),
        }))
      : [];
  return {
    trach_nhiem: norm(row?.trach_nhiem),
    nguoi_tao: norm(row?.nguoi_tao),
  };
}

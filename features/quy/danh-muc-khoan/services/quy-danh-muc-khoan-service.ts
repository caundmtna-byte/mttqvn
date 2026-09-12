import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { QuyKey, QuyLoai, QuyTrangThai } from '../../core/constants';
import type {
  QuyDanhMucKhoanDetail,
  QuyDanhMucKhoanListRow,
  QuyKhoanOption,
} from '../core/types';
import type { QuyDanhMucKhoanFormValues } from '../core/schema';
import {
  QUY_DANH_MUC_KHOAN_RETURNING,
  QUY_DANH_MUC_KHOAN_SELECT,
  QUY_KHOAN_OPTION_SELECT,
} from '../core/supabase-select';

const TABLE = 'quy_danh_muc_khoan';

function nullableStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function toNumber(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function flattenKhoanRow(row: Record<string, unknown>): QuyDanhMucKhoanListRow {
  return {
    id: String(row.id ?? ''),
    quy: String(row.quy ?? '') as QuyKey,
    loai: String(row.loai ?? 'thu') as QuyLoai,
    ten: String(row.ten ?? ''),
    mo_ta: nullableStr(row.mo_ta),
    thu_tu: toNumber(row.thu_tu),
    trang_thai: String(row.trang_thai ?? 'Hoạt động') as QuyTrangThai,
    tg_tao: String(row.tg_tao ?? ''),
    tg_cap_nhat: String(row.tg_cap_nhat ?? ''),
  };
}

/** `quy` lấy từ route, không từ form — xem ghi chú ở service danh mục tài khoản. */
function formToPayload(quy: QuyKey, data: QuyDanhMucKhoanFormValues) {
  const thuTu = data.thu_tu.trim();
  return {
    quy,
    loai: data.loai,
    ten: data.ten.trim(),
    mo_ta: nullableStr(data.mo_ta),
    thu_tu: thuTu === '' ? 0 : Number(thuTu),
    trang_thai: data.trang_thai,
  };
}

export async function getQuyDanhMucKhoanList(quy: QuyKey): Promise<QuyDanhMucKhoanListRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select(QUY_DANH_MUC_KHOAN_SELECT)
    .eq('quy', quy)
    .order('loai', { ascending: true })
    .order('thu_tu', { ascending: true })
    .order('id', { ascending: true });
  if (error) handleSupabaseError(error);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(flattenKhoanRow);
}

export async function getQuyDanhMucKhoanById(id: string): Promise<QuyDanhMucKhoanDetail | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select(QUY_DANH_MUC_KHOAN_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenKhoanRow(data as unknown as Record<string, unknown>);
}

export async function getQuyKhoanOptions(quy: QuyKey): Promise<QuyKhoanOption[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select(QUY_KHOAN_OPTION_SELECT)
    .eq('quy', quy)
    .order('thu_tu', { ascending: true })
    .order('id', { ascending: true });
  if (error) handleSupabaseError(error);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
    id: String(r.id ?? ''),
    loai: String(r.loai ?? 'thu') as QuyLoai,
    ten: String(r.ten ?? ''),
    trang_thai: String(r.trang_thai ?? 'Hoạt động') as QuyTrangThai,
  }));
}

export async function createQuyDanhMucKhoan(
  quy: QuyKey,
  data: QuyDanhMucKhoanFormValues,
): Promise<QuyDanhMucKhoanListRow> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Chưa cấu hình kết nối máy chủ dữ liệu.');
  const { data: inserted, error } = await supabase
    .from(TABLE)
    .insert(formToPayload(quy, data))
    .select(QUY_DANH_MUC_KHOAN_RETURNING)
    .single();
  if (error) handleSupabaseError(error);
  return flattenKhoanRow(inserted as unknown as Record<string, unknown>);
}

export async function updateQuyDanhMucKhoan(
  quy: QuyKey,
  id: string,
  data: QuyDanhMucKhoanFormValues,
): Promise<QuyDanhMucKhoanListRow> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Chưa cấu hình kết nối máy chủ dữ liệu.');
  const { data: updated, error } = await supabase
    .from(TABLE)
    .update(formToPayload(quy, data))
    .eq('id', id)
    .select(QUY_DANH_MUC_KHOAN_RETURNING)
    .single();
  if (error) handleSupabaseError(error);
  return flattenKhoanRow(updated as unknown as Record<string, unknown>);
}

export async function deleteQuyDanhMucKhoanMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = getSupabase();
  if (!supabase) throw new Error('Chưa cấu hình kết nối máy chủ dữ liệu.');
  const { error } = await supabase.from(TABLE).delete().in('id', ids);
  if (error) handleSupabaseError(error);
}

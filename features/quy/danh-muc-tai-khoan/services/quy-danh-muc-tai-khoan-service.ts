import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { QuyKey, QuyTrangThai } from '../../core/constants';
import type {
  QuyDanhMucTaiKhoanDetail,
  QuyDanhMucTaiKhoanListRow,
  QuyTaiKhoanOption,
} from '../core/types';
import type { QuyDanhMucTaiKhoanFormValues } from '../core/schema';
import {
  QUY_DANH_MUC_TAI_KHOAN_RETURNING,
  QUY_DANH_MUC_TAI_KHOAN_SELECT,
  QUY_TAI_KHOAN_OPTION_SELECT,
} from '../core/supabase-select';
import { normalizeSoDuRow, type QuySoDuTaiKhoanRow } from '../../utils/quy-so-du';

const TABLE = 'quy_danh_muc_tai_khoan';

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

export function flattenTaiKhoanRow(row: Record<string, unknown>): QuyDanhMucTaiKhoanListRow {
  return {
    id: String(row.id ?? ''),
    quy: String(row.quy ?? '') as QuyKey,
    ten: String(row.ten ?? ''),
    so_tai_khoan: nullableStr(row.so_tai_khoan),
    ngan_hang: nullableStr(row.ngan_hang),
    mo_ta: nullableStr(row.mo_ta),
    trang_thai: (String(row.trang_thai ?? 'Hoạt động') as QuyTrangThai),
    thu_tu: toNumber(row.thu_tu),
    tg_tao: String(row.tg_tao ?? ''),
    tg_cap_nhat: String(row.tg_cap_nhat ?? ''),
  };
}

/**
 * `quy` KHÔNG lấy từ form — luôn lấy từ tham số route, để một tài khoản không
 * thể vô tình rơi sang quỹ kia. Trigger `fn_quy_kiem_cung_quy` ở DB cũng chặn
 * việc gán chéo, nhưng chặn ngay từ đây thì người dùng không bao giờ gặp lỗi đó.
 */
function formToPayload(quy: QuyKey, data: QuyDanhMucTaiKhoanFormValues) {
  const thuTu = data.thu_tu.trim();
  return {
    quy,
    ten: data.ten.trim(),
    so_tai_khoan: nullableStr(data.so_tai_khoan),
    ngan_hang: nullableStr(data.ngan_hang),
    mo_ta: nullableStr(data.mo_ta),
    trang_thai: data.trang_thai,
    thu_tu: thuTu === '' ? 0 : Number(thuTu),
  };
}

export async function getQuyDanhMucTaiKhoanList(
  quy: QuyKey,
): Promise<QuyDanhMucTaiKhoanListRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select(QUY_DANH_MUC_TAI_KHOAN_SELECT)
    .eq('quy', quy)
    .order('thu_tu', { ascending: true })
    .order('id', { ascending: true });
  if (error) handleSupabaseError(error);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(flattenTaiKhoanRow);
}

export async function getQuyDanhMucTaiKhoanById(
  id: string,
): Promise<QuyDanhMucTaiKhoanDetail | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select(QUY_DANH_MUC_TAI_KHOAN_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenTaiKhoanRow(data as unknown as Record<string, unknown>);
}

/** Tùy chọn cho ô chọn tài khoản khi lập phiếu — chỉ tài khoản đang hoạt động. */
export async function getQuyTaiKhoanOptions(quy: QuyKey): Promise<QuyTaiKhoanOption[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select(QUY_TAI_KHOAN_OPTION_SELECT)
    .eq('quy', quy)
    .order('thu_tu', { ascending: true })
    .order('id', { ascending: true });
  if (error) handleSupabaseError(error);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
    id: String(r.id ?? ''),
    ten: String(r.ten ?? ''),
    so_tai_khoan: nullableStr(r.so_tai_khoan),
    ngan_hang: nullableStr(r.ngan_hang),
    trang_thai: String(r.trang_thai ?? 'Hoạt động') as QuyTrangThai,
  }));
}

/** Số dư từng tài khoản của quỹ (`quy_so_du_view` = tổng thu − tổng chi, chưa có tồn đầu kỳ). */
export async function getQuySoDuTheoTaiKhoan(quy: QuyKey): Promise<QuySoDuTaiKhoanRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('quy_so_du_view')
    .select('quy,tai_khoan_id,ten_tai_khoan,tong_thu,tong_chi,so_du')
    .eq('quy', quy);
  if (error) handleSupabaseError(error);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(normalizeSoDuRow);
}

export async function createQuyDanhMucTaiKhoan(
  quy: QuyKey,
  data: QuyDanhMucTaiKhoanFormValues,
): Promise<QuyDanhMucTaiKhoanListRow> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Chưa cấu hình kết nối máy chủ dữ liệu.');
  const { data: inserted, error } = await supabase
    .from(TABLE)
    .insert(formToPayload(quy, data))
    .select(QUY_DANH_MUC_TAI_KHOAN_RETURNING)
    .single();
  if (error) handleSupabaseError(error);
  return flattenTaiKhoanRow(inserted as unknown as Record<string, unknown>);
}

export async function updateQuyDanhMucTaiKhoan(
  quy: QuyKey,
  id: string,
  data: QuyDanhMucTaiKhoanFormValues,
): Promise<QuyDanhMucTaiKhoanListRow> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Chưa cấu hình kết nối máy chủ dữ liệu.');
  const { data: updated, error } = await supabase
    .from(TABLE)
    .update(formToPayload(quy, data))
    .eq('id', id)
    .select(QUY_DANH_MUC_TAI_KHOAN_RETURNING)
    .single();
  if (error) handleSupabaseError(error);
  return flattenTaiKhoanRow(updated as unknown as Record<string, unknown>);
}

export async function deleteQuyDanhMucTaiKhoanMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = getSupabase();
  if (!supabase) throw new Error('Chưa cấu hình kết nối máy chủ dữ liệu.');
  const { error } = await supabase.from(TABLE).delete().in('id', ids);
  if (error) handleSupabaseError(error);
}

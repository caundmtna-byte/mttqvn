import {
  formatDisplayDateShort,
  formatDisplayDateTimeShort,
  trimmedDisplay,
} from '@/lib/display-format';
import { formatCurrency } from '@/lib/utils';
import type { ViNguoiNgheo } from '../core/types';

export function formatVnnNgayDisplay(value: string | null | undefined): string {
  return formatDisplayDateShort(value);
}

export function formatVnnDateTimeDisplay(value: string | null | undefined): string {
  return formatDisplayDateTimeShort(value);
}

/**
 * `null` ⇒ chuỗi rỗng chứ KHÔNG phải "0 ₫": khoản chỉ có quà hoặc chưa chốt
 * mức, hiện 0 sẽ bị đọc nhầm là "được hỗ trợ 0 đồng".
 */
export function formatVnnSoTienDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '';
  return formatCurrency(Number(value));
}

export function formatVnnNguoiTaoDisplay(item: ViNguoiNgheo): string {
  return item.ho_va_ten_nguoi_tao?.trim() || item.ten_tai_khoan_nguoi_tao?.trim() || '';
}

export function trimmedVnnDisplay(value: string | null | undefined): string | null {
  return trimmedDisplay(value);
}

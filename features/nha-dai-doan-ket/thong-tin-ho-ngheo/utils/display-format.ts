import {
  formatDisplayDateShort,
  formatDisplayDateTimeShort,
  trimmedDisplay,
} from '@/lib/display-format';
import { formatPhoneDisplay } from '@/lib/display-format';
import { formatCurrency } from '@/lib/utils';
import type { HoNgheo } from '../core/types';

export function formatHnghNgayDisplay(value: string | null | undefined): string {
  return formatDisplayDateShort(value);
}

export function formatHnghDateTimeDisplay(value: string | null | undefined): string {
  return formatDisplayDateTimeShort(value);
}

/**
 * Số tiền hiển thị. `null` ⇒ chuỗi rỗng chứ KHÔNG phải "0 ₫": khoản đang khảo
 * sát chưa chốt mức hỗ trợ, hiện 0 sẽ bị đọc nhầm là "được duyệt 0 đồng".
 */
export function formatHnghSoTienDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '';
  return formatCurrency(Number(value));
}

export function formatHnghDienThoaiDisplay(value: string | null | undefined): string {
  const s = value?.trim();
  return s ? formatPhoneDisplay(s) : '';
}

export function formatHnghNguoiTaoDisplay(item: HoNgheo): string {
  return item.ho_va_ten_nguoi_tao?.trim() || item.ten_tai_khoan_nguoi_tao?.trim() || '';
}

export function trimmedHnghDisplay(value: string | null | undefined): string | null {
  return trimmedDisplay(value);
}

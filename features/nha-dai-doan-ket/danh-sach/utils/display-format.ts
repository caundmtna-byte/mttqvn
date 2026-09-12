import {
  formatDisplayDateShort,
  formatDisplayDateTimeShort,
  trimmedDisplay,
} from '@/lib/display-format';
import { formatCurrency } from '@/lib/utils';
import type { NhaDaiDoanKet } from '../core/types';

export function formatNddkNgayDisplay(value: string | null | undefined): string {
  return formatDisplayDateShort(value);
}

export function formatNddkDateTimeDisplay(value: string | null | undefined): string {
  return formatDisplayDateTimeShort(value);
}

/**
 * Số tiền hiển thị. `null` ⇒ chuỗi rỗng chứ KHÔNG phải "0 ₫": hồ sơ đang khảo
 * sát chưa chốt mức hỗ trợ, hiện 0 sẽ bị đọc nhầm là "được duyệt 0 đồng".
 */
export function formatNddkSoTienDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '';
  return formatCurrency(Number(value));
}

export function formatNddkNguoiTaoDisplay(item: NhaDaiDoanKet): string {
  return item.ho_va_ten_nguoi_tao?.trim() || item.ten_tai_khoan_nguoi_tao?.trim() || '';
}

export function trimmedNddkDisplay(value: string | null | undefined): string | null {
  return trimmedDisplay(value);
}

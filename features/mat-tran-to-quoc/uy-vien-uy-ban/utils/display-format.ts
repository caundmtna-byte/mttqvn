import type { BadgeConfig } from '@/components/ui/EnumBadge';
import { formatDate, formatDateShort } from '@/lib/utils';
import {
  canBoPhoneTelHref,
  formatCanBoPhoneDisplay,
  trimmedDisplay,
} from '@/features/mat-tran-to-quoc/danh-sach-can-bo/utils/display-format';

/** Ngày ISO (YYYY-MM-DD) → hiển thị DD/MM/YYYY (chi tiết). */
export function formatUyVienDetailDate(iso: string | null | undefined): string | null {
  if (iso == null || !String(iso).trim()) return null;
  return formatDate(iso);
}

/** Ngày ISO → hiển thị ngắn (bảng / phụ đề). */
export function formatUyVienListDate(iso: string | null | undefined, emptyLabel: string): string {
  if (iso == null || !String(iso).trim()) return emptyLabel;
  return formatDateShort(iso);
}

/** Mã UV: trim + in hoa + font hiển thị gọn. */
export function formatUyVienMaUvDisplay(ma: string | null | undefined): string {
  const t = trimmedDisplay(ma);
  return t ? t.toUpperCase() : '';
}

export function formatUyVienPhoneDisplay(phone: string | null | undefined): string {
  return formatCanBoPhoneDisplay(phone);
}

export function uyVienPhoneTelHref(phone: string | null | undefined): string | null {
  return canBoPhoneTelHref(phone);
}

export function getUyVienGioiTinhBadgeConfig(): BadgeConfig<string> {
  return {
    Nam: { label: 'Nam', color: 'blue' },
    Nữ: { label: 'Nữ', color: 'pink' },
    Khác: { label: 'Khác', color: 'slate' },
  };
}

/** Giá trị nghiệp vụ thường gặp; không khớp → EnumBadge dùng fallback slate. */
export function getUyVienTrangThamGiaBadgeConfig(): BadgeConfig<string> {
  return {
    'Đang tham gia': { label: 'Đang tham gia', color: 'emerald' },
    'Thôi tham gia': { label: 'Thôi tham gia', color: 'slate' },
    'Tạm nghỉ': { label: 'Tạm nghỉ', color: 'amber' },
    'Chờ xác nhận': { label: 'Chờ xác nhận', color: 'sky' },
  };
}

export function getUyVienDangVienBadgeConfig(): BadgeConfig<string> {
  return {
    Có: { label: 'Có', color: 'rose' },
    Không: { label: 'Không', color: 'slate' },
  };
}

import type { BadgeConfig } from '@/components/ui/EnumBadge';
import {
  MTTQ_UY_VIEN_TRANG_THAM_GIA_DANG,
  MTTQ_UY_VIEN_TRANG_THAM_GIA_THOI,
} from '../core/constants';
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

export function getUyVienTrangThamGiaBadgeConfig(): BadgeConfig<string> {
  return {
    [MTTQ_UY_VIEN_TRANG_THAM_GIA_DANG]: { label: MTTQ_UY_VIEN_TRANG_THAM_GIA_DANG, color: 'emerald' },
    [MTTQ_UY_VIEN_TRANG_THAM_GIA_THOI]: { label: MTTQ_UY_VIEN_TRANG_THAM_GIA_THOI, color: 'slate' },
  };
}

export function getUyVienDangVienBadgeConfig(): BadgeConfig<string> {
  return {
    Có: { label: 'Có', color: 'rose' },
    Không: { label: 'Không', color: 'slate' },
  };
}

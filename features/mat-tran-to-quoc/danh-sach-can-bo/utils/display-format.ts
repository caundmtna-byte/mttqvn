import {
  formatDate,
  formatDateShort,
  formatDateShortTime,
} from '@/lib/utils';

/** Chuỗi hiển thị sau trim; rỗng → null (để DetailField dùng empty). */
export function trimmedDisplay(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t.length ? t : null;
}

/** Chỉ chữ số cho `tel:` và kiểm tra. */
export function canBoPhoneDigits(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '');
}

/**
 * Định dạng điện thoại VN hiển thị (không ép nếu không khớp pattern số).
 * Ví dụ: 0912345678 → 0912 345 678
 */
export function formatCanBoPhoneDisplay(value: string | null | undefined): string {
  const raw = trimmedDisplay(value);
  if (!raw) return '';
  const d = canBoPhoneDigits(raw);
  if (d.length < 9) return raw;
  let n = d;
  if (n.startsWith('84') && n.length >= 10) n = `0${n.slice(2)}`;
  if (!n.startsWith('0')) return raw;
  if (n.length === 10) return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  if (n.length === 11) return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  return raw;
}

/** `tel:` href hoặc null nếu không có số. */
export function canBoPhoneTelHref(value: string | null | undefined): string | null {
  const d = canBoPhoneDigits(value);
  if (!d) return null;
  let n = d;
  if (n.startsWith('84') && n.length >= 10) n = `0${n.slice(2)}`;
  if (!n.startsWith('0')) return `tel:${d}`;
  return `tel:${n}`;
}

export function formatCanBoListDate(iso: string | null | undefined, emptyLabel: string): string {
  if (iso == null || !String(iso).trim()) return emptyLabel;
  return formatDateShort(iso);
}

export function formatCanBoDetailDate(iso: string | null | undefined): string | null {
  if (iso == null || !String(iso).trim()) return null;
  return formatDate(iso);
}

export function formatCanBoListDateTime(iso: string | null | undefined, emptyLabel: string): string {
  if (iso == null || !String(iso).trim()) return emptyLabel;
  return formatDateShortTime(iso);
}

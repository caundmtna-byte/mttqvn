import { formatDate, formatDateShort, formatDateShortTime, formatDateTimeShort } from '@/lib/utils';

/** Chuỗi hiển thị sau trim; rỗng → null (DetailField dùng emptyText). */
export function trimmedDisplay(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t.length ? t : null;
}

export function formatDisplayDateShort(value: string | null | undefined): string {
  const t = value?.trim();
  return t ? formatDateShort(t) : '';
}

export function formatDisplayDateTimeShort(value: string | null | undefined): string {
  const t = value?.trim();
  return t ? formatDateTimeShort(t) : '';
}

export function formatDisplayInteger(value: number | null | undefined, fallback = '0'): string {
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : fallback;
}

/** Chỉ chữ số cho `tel:` và kiểm tra. */
export function phoneDigits(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '');
}

/**
 * Định dạng điện thoại VN hiển thị (không ép nếu không khớp pattern số).
 * Ví dụ: 0912345678 → 0912 345 678
 */
export function formatPhoneDisplay(value: string | null | undefined): string {
  const raw = trimmedDisplay(value);
  if (!raw) return '';
  const d = phoneDigits(raw);
  if (d.length < 9) return raw;
  let n = d;
  if (n.startsWith('84') && n.length >= 10) n = `0${n.slice(2)}`;
  if (!n.startsWith('0')) return raw;
  if (n.length === 10) return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  if (n.length === 11) return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  return raw;
}

/** `tel:` href hoặc null nếu không có số. */
export function phoneTelHref(value: string | null | undefined): string | null {
  const d = phoneDigits(value);
  if (!d) return null;
  let n = d;
  if (n.startsWith('84') && n.length >= 10) n = `0${n.slice(2)}`;
  if (!n.startsWith('0')) return `tel:${d}`;
  return `tel:${n}`;
}

/** List / thẻ mobile: ngày đầy đủ kèm năm (DD/MM/YYYY). */
export function formatListDate(iso: string | null | undefined, emptyLabel: string): string {
  if (iso == null || !String(iso).trim()) return emptyLabel;
  return formatDate(iso);
}

export function formatDetailDate(iso: string | null | undefined): string | null {
  if (iso == null || !String(iso).trim()) return null;
  return formatDate(iso);
}

export function formatListDateTime(iso: string | null | undefined, emptyLabel: string): string {
  if (iso == null || !String(iso).trim()) return emptyLabel;
  return formatDateShortTime(iso);
}

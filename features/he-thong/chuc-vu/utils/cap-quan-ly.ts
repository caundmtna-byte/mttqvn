import type { BadgeConfig } from '@/components/ui/EnumBadge';

export const CAP_QUAN_LY_VALUES = ['Tỉnh', 'Xã phường'] as const;
export type CapQuanLy = (typeof CAP_QUAN_LY_VALUES)[number];

/** Chuẩn Unicode (NFKC) để khớp giá trị SQL/client khác dạng tổ hợp ký tự. */
function capQuanLyKey(s: string): string {
  try {
    return s.normalize('NFKC').trim();
  } catch {
    return s.trim();
  }
}

export function isCapQuanLy(v: string | null | undefined): v is CapQuanLy {
  if (v == null) return false;
  const t = capQuanLyKey(String(v));
  return t === 'Tỉnh' || t === 'Xã phường';
}

/** Chuẩn hoá từ form/import/DB → giá trị canonical hoặc null. */
export function normalizeCapQuanLyInput(v: string | null | undefined): CapQuanLy | null {
  if (v == null || String(v).trim() === '') return null;
  const t = capQuanLyKey(String(v));
  if (t === 'Tỉnh') return 'Tỉnh';
  if (t === 'Xã phường') return 'Xã phường';
  return null;
}

/** Tỉnh = violet; Xã phường = cyan — dễ phân biệt trên list/detail. */
export function capQuanLyBadgeConfig(
  labelTinh: string,
  labelXaPhuong: string,
): BadgeConfig<string> {
  return {
    'Tỉnh': { label: labelTinh, color: 'violet' },
    'Xã phường': { label: labelXaPhuong, color: 'cyan' },
  };
}

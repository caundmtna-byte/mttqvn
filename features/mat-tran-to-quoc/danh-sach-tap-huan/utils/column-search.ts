import { formatDateTimeShort } from '@/lib/utils';
import type { MttqLopTapHuanListRow, MttqTapHuanChiTietFlatRow } from '../core/types';

/**
 * Cột dùng MultiSelect trong header — không áp thêm `columnSearch` text cho cùng key
 * (trùng với toolbar `cap_tap_huan` / `nam_tap_huan`).
 */
export const MTTQ_TAP_HUAN_COLUMN_IDS_WITH_MULTISELECT = [
  'cap_tap_huan',
  'nam_tap_huan',
] as const;

/** Số ô columnSearch đang có nội dung (bỏ cột đã có MultiSelect trong header). */
export function countTapHuanColumnSearchActive(columnSearch: Record<string, string> | undefined): number {
  if (!columnSearch) return 0;
  const skip = MTTQ_TAP_HUAN_COLUMN_IDS_WITH_MULTISELECT as readonly string[];
  let n = 0;
  for (const [colId, q] of Object.entries(columnSearch)) {
    if (!q.trim()) continue;
    if (skip.includes(colId)) continue;
    n += 1;
  }
  return n;
}

/**
 * AND theo từng key `columnSearch` (substring, không phân biệt hoa thường).
 * Bỏ qua các cột đã có MultiSelect trong header.
 */
export function mttqTapHuanMatchesColumnSearch(
  row: MttqLopTapHuanListRow,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  const skip = MTTQ_TAP_HUAN_COLUMN_IDS_WITH_MULTISELECT as readonly string[];

  for (const [colId, q] of Object.entries(columnSearch)) {
    if (skip.includes(colId)) continue;
    const trimmed = q.trim();
    if (!trimmed) continue;

    let haystack = '';
    switch (colId) {
      case 'tg_cap_nhat':
        haystack = `${row.tg_cap_nhat ?? ''} ${
          row.tg_cap_nhat ? formatDateTimeShort(row.tg_cap_nhat) : ''
        }`.trim();
        break;
      case 'ho_va_ten_nguoi_tao':
        haystack = [row.ho_va_ten_nguoi_tao, row.ten_tai_khoan_nguoi_tao].filter(Boolean).join(' ');
        break;
      default: {
        const raw = row[colId as keyof MttqLopTapHuanListRow];
        haystack = raw == null ? '' : String(raw);
      }
    }
    if (!haystack.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}

/** Lọc cột tab Danh sách chi tiết (dòng phẳng `mttq_lop_tap_huan_ct`). */
export function mttqTapHuanChiTietFlatMatchesColumnSearch(
  row: MttqTapHuanChiTietFlatRow,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  const skip = MTTQ_TAP_HUAN_COLUMN_IDS_WITH_MULTISELECT as readonly string[];

  for (const [colId, q] of Object.entries(columnSearch)) {
    if (skip.includes(colId)) continue;
    const trimmed = q.trim();
    if (!trimmed) continue;

    let haystack = '';
    switch (colId) {
      case 'tg_cap_nhat_lop':
        haystack = `${row.tg_cap_nhat_lop ?? ''} ${
          row.tg_cap_nhat_lop ? formatDateTimeShort(row.tg_cap_nhat_lop) : ''
        }`.trim();
        break;
      default: {
        const raw = row[colId as keyof MttqTapHuanChiTietFlatRow];
        haystack = raw == null ? '' : String(raw);
      }
    }
    if (!haystack.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}

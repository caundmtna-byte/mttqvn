import { formatDateShort, formatDateTimeShort } from '@/lib/utils';
import type { MttqKhenThuongListRow } from '../core/types';

/**
 * Cột dùng MultiSelect trong header (`ColumnHeaderFilter`) —
 * không áp thêm `columnSearch` text cho cùng key (trùng với toolbar `trang_thai`).
 */
export const MTTQ_KHEN_THUONG_COLUMN_IDS_WITH_MULTISELECT = ['trang_thai'] as const;

/** Số ô columnSearch đang có nội dung (bỏ cột đã có MultiSelect trong header). */
export function countKhenThuongColumnSearchActive(columnSearch: Record<string, string> | undefined): number {
  if (!columnSearch) return 0;
  const skip = MTTQ_KHEN_THUONG_COLUMN_IDS_WITH_MULTISELECT as readonly string[];
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
 * Bỏ qua `trang_thai` (đã lọc qua `filters.trang_thai`).
 */
export function mttqKhenThuongMatchesColumnSearch(
  row: MttqKhenThuongListRow,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  const skip = MTTQ_KHEN_THUONG_COLUMN_IDS_WITH_MULTISELECT as readonly string[];

  for (const [colId, q] of Object.entries(columnSearch)) {
    if (skip.includes(colId)) continue;
    const trimmed = q.trim();
    if (!trimmed) continue;

    let haystack = '';
    switch (colId) {
      case 'ngay_khen_thuong':
        haystack = `${row.ngay_khen_thuong ?? ''} ${
          row.ngay_khen_thuong ? formatDateShort(row.ngay_khen_thuong) : ''
        }`.trim();
        break;
      case 'tg_cap_nhat':
        haystack = `${row.tg_cap_nhat ?? ''} ${
          row.tg_cap_nhat ? formatDateTimeShort(row.tg_cap_nhat) : ''
        }`.trim();
        break;
      case 'ho_va_ten_nguoi_tao':
        haystack = [row.ho_va_ten_nguoi_tao, row.ten_tai_khoan_nguoi_tao].filter(Boolean).join(' ');
        break;
      default: {
        const raw = row[colId as keyof MttqKhenThuongListRow];
        haystack = raw == null ? '' : String(raw);
      }
    }
    if (!haystack.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}

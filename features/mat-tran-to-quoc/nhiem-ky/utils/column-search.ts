import { formatDateTimeShort } from '@/lib/utils';
import type { MttqNhiemKyListRow } from '../core/types';

/** Cột dùng MultiSelect trong header — không áp thêm `columnSearch` text cho cùng key. */
export const MTTQ_NHIEM_KY_COLUMN_IDS_WITH_MULTISELECT = ['tu_nam', 'den_nam'] as const;

/** Số ô columnSearch đang có nội dung (bỏ cột đã có MultiSelect trong header). */
export function countNhiemKyColumnSearchActive(columnSearch: Record<string, string> | undefined): number {
  if (!columnSearch) return 0;
  const skip = MTTQ_NHIEM_KY_COLUMN_IDS_WITH_MULTISELECT as readonly string[];
  let n = 0;
  for (const [colId, q] of Object.entries(columnSearch)) {
    if (!q.trim()) continue;
    if (skip.includes(colId)) continue;
    n += 1;
  }
  return n;
}

export function mttqNhiemKyMatchesColumnSearch(
  row: MttqNhiemKyListRow,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  const skip = MTTQ_NHIEM_KY_COLUMN_IDS_WITH_MULTISELECT as readonly string[];

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
        const raw = row[colId as keyof MttqNhiemKyListRow];
        haystack = raw == null ? '' : String(raw);
      }
    }
    if (!haystack.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}

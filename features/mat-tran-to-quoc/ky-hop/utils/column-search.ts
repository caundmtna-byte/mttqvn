import { formatDateTimeShort } from '@/lib/utils';
import type { MttqKyHopListRow } from '../core/types';

/** Cột có lọc MultiSelect trong header — không áp thêm `columnSearch` text cho cùng key. */
export const MTTQ_KY_HOP_COLUMN_IDS_WITH_MULTISELECT = ['ten_nhiem_ky', 'ten_don_vi', 'ngay_hop'] as const;

export function donViDisplayLabel(row: MttqKyHopListRow, tinhCapLabel: string): string {
  if (row.don_vi_id == null || row.don_vi_id === '') return tinhCapLabel;
  return row.ten_don_vi?.trim() || tinhCapLabel;
}

export function yearFromNgayHop(row: MttqKyHopListRow): string {
  if (!row.ngay_hop || row.ngay_hop.length < 4) return '';
  return row.ngay_hop.slice(0, 4);
}

export function countKyHopColumnSearchActive(columnSearch: Record<string, string> | undefined): number {
  if (!columnSearch) return 0;
  const skip = MTTQ_KY_HOP_COLUMN_IDS_WITH_MULTISELECT as readonly string[];
  let n = 0;
  for (const [colId, q] of Object.entries(columnSearch)) {
    if (!q.trim()) continue;
    if (skip.includes(colId)) continue;
    n += 1;
  }
  return n;
}

export function mttqKyHopMatchesColumnSearch(
  row: MttqKyHopListRow,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  const skip = MTTQ_KY_HOP_COLUMN_IDS_WITH_MULTISELECT as readonly string[];

  for (const [colId, q] of Object.entries(columnSearch)) {
    if (skip.includes(colId)) continue;
    const trimmed = q.trim();
    if (!trimmed) continue;

    let haystack: string;
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
        const raw = row[colId as keyof MttqKyHopListRow];
        haystack = raw == null ? '' : String(raw);
      }
    }
    if (!haystack.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}

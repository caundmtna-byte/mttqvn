import { formatDate, formatDateShort, formatDateTimeShort } from '@/lib/utils';
import type { MttqUyVienUyBanListRow } from '../core/types';
import { formatUyVienMaUvDisplay } from './display-format';

/** Cột có lọc MultiSelect trong header — không áp thêm `columnSearch` text cho cùng key. */
export const MTTQ_UY_VIEN_UY_BAN_COLUMN_IDS_WITH_MULTISELECT = ['ten_nhiem_ky', 'ten_don_vi'] as const;

export function donViDisplayLabel(row: MttqUyVienUyBanListRow, tinhCapLabel: string): string {
  if (row.don_vi_id == null || row.don_vi_id === '') return tinhCapLabel;
  return row.ten_don_vi?.trim() || tinhCapLabel;
}

export function countUyVienUyBanColumnSearchActive(columnSearch: Record<string, string> | undefined): number {
  if (!columnSearch) return 0;
  const skip = MTTQ_UY_VIEN_UY_BAN_COLUMN_IDS_WITH_MULTISELECT as readonly string[];
  let n = 0;
  for (const [colId, q] of Object.entries(columnSearch)) {
    if (!q.trim()) continue;
    if (skip.includes(colId)) continue;
    n += 1;
  }
  return n;
}

export function mttqUyVienUyBanMatchesColumnSearch(
  row: MttqUyVienUyBanListRow,
  columnSearch: Record<string, string> | undefined,
  tinhCapLabel: string,
): boolean {
  if (!columnSearch) return true;
  const skip = MTTQ_UY_VIEN_UY_BAN_COLUMN_IDS_WITH_MULTISELECT as readonly string[];

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
      case 'ma_uv': {
        const raw = row.ma_uv ?? '';
        const disp = formatUyVienMaUvDisplay(row.ma_uv);
        haystack = [raw, disp].filter(Boolean).join(' ');
        break;
      }
      case 'ngay_sinh': {
        const raw = row.ngay_sinh ?? '';
        haystack = [raw, raw ? formatDate(raw) : '', raw ? formatDateShort(raw) : ''].filter(Boolean).join(' ');
        break;
      }
      case 'ho_va_ten_nguoi_tao':
        haystack = [row.ho_va_ten_nguoi_tao, row.ten_tai_khoan_nguoi_tao].filter(Boolean).join(' ');
        break;
      case 'ten_don_vi':
        haystack = donViDisplayLabel(row, tinhCapLabel);
        break;
      case 'dang_vien':
        haystack = row.dang_vien ? 'có true 1' : 'không false 0';
        break;
      default: {
        const raw = row[colId as keyof MttqUyVienUyBanListRow];
        haystack = raw == null ? '' : String(raw);
      }
    }
    if (!haystack.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}

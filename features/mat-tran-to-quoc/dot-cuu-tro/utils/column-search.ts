import type { KhoDotCuuTroListRow } from '../core/types';
import { thoiGianChuongTrinh } from './display';

export function countKhoDotCuuTroColumnSearchActive(columnSearch: Record<string, string> | undefined): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const [, q] of Object.entries(columnSearch)) {
    if (q.trim()) n += 1;
  }
  return n;
}

/** Chuỗi hiển thị của một cột — dùng cho tìm theo cột. */
function haystackOf(row: KhoDotCuuTroListRow, colId: string): string {
  switch (colId) {
    case 'tt':
      return String(row.tt ?? '');
    case 'thoi_gian':
      return thoiGianChuongTrinh(row);
    case 'ten':
    case 'loai':
    case 'don_vi_chu_tri_label':
    case 'tai_khoan_tiep_nhan':
    case 'ngan_hang':
    case 'trang_thai':
    case 'tien_do':
    case 'link':
    case 'tg_tao':
    case 'tg_cap_nhat':
      return String(row[colId] ?? '');
    default:
      return '';
  }
}

export function khoDotCuuTroMatchesColumnSearch(
  row: KhoDotCuuTroListRow,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    if (!haystackOf(row, colId).toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}

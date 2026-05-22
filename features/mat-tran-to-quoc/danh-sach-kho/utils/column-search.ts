import type { KhoDanhSachKhoListRow } from '../core/types';

export function countKhoDanhSachKhoColumnSearchActive(columnSearch: Record<string, string> | undefined): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const [, q] of Object.entries(columnSearch)) {
    if (q.trim()) n += 1;
  }
  return n;
}

export function khoDanhSachKhoMatchesColumnSearch(
  row: KhoDanhSachKhoListRow,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    let haystack = '';
    switch (colId) {
      case 'tt':
        haystack = String(row.tt ?? '');
        break;
      case 'ten_kho':
        haystack = row.ten_kho ?? '';
        break;
      case 'ten_don_vi':
        haystack = row.ten_don_vi ?? '';
        break;
      case 'ten_tinh':
        haystack = row.ten_tinh ?? '';
        break;
      case 'mo_ta':
        haystack = row.mo_ta ?? '';
        break;
      case 'tg_tao':
        haystack = row.tg_tao ?? '';
        break;
      case 'tg_cap_nhat':
        haystack = row.tg_cap_nhat ?? '';
        break;
      default:
        haystack = '';
    }
    if (!haystack.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}

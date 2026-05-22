import type { LuongBacTableRow } from './bac-sort';

export function countLuongBacColumnSearchActive(columnSearch: Record<string, string> | undefined): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const [, q] of Object.entries(columnSearch)) {
    if (q.trim()) n += 1;
  }
  return n;
}

export function luongBacMatchesColumnSearch(
  row: LuongBacTableRow,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    let haystack = '';
    switch (colId) {
      case 'ma_bac':
        haystack = row.ma_bac ?? '';
        break;
      case 'thu_tu':
        haystack = String(row.thu_tu ?? '');
        break;
      case 'he_so':
        haystack = row.he_so_display ?? '';
        break;
      case 'luong':
        haystack = row.luong_search ?? String(row.luong_preview ?? '');
        break;
      default:
        haystack = '';
    }
    if (!haystack.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}

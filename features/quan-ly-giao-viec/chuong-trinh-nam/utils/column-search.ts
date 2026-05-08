import type { ChuongTrinhNamFilters, ChuongTrinhNamListRow } from '../core/types';

export function chuongTrinhNamMatchesColumnSearch(
  item: ChuongTrinhNamListRow,
  columnSearch: ChuongTrinhNamFilters['columnSearch'],
): boolean {
  for (const [colId, raw] of Object.entries(columnSearch)) {
    const q = (raw ?? '').trim().toLowerCase();
    if (!q) continue;
    const v = item[colId as keyof ChuongTrinhNamListRow];
    const hay = v == null ? '' : String(v).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

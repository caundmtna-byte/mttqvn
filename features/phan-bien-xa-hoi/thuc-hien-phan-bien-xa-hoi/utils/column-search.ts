import type { ThucHienPhanBien } from '../core/types';
import { getThucHienColumnDisplayValue } from './column-display';

export function countThucHienColumnSearchActive(columnSearch: Record<string, string>): number {
  let n = 0;
  for (const v of Object.values(columnSearch)) {
    if (v?.trim()) n += 1;
  }
  return n;
}

export function thucHienMatchesColumnSearch(
  item: ThucHienPhanBien,
  columnSearch: Record<string, string>,
): boolean {
  for (const [colId, term] of Object.entries(columnSearch)) {
    const t = term?.trim();
    if (!t) continue;
    const val = getThucHienColumnDisplayValue(item, colId).toLowerCase();
    if (!val.includes(t.toLowerCase())) return false;
  }
  return true;
}

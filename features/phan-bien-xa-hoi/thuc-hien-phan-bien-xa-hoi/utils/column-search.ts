import type { ThucHienPhanBien } from '../core/types';

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
    const val = String((item as unknown as Record<string, unknown>)[colId] ?? '').toLowerCase();
    if (!val.includes(t.toLowerCase())) return false;
  }
  return true;
}

import type { TinhThanh } from '../core/types';
import type { XaPhuong } from '../core/types';

export function countColumnSearchActive(columnSearch: Record<string, string> | undefined): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const q of Object.values(columnSearch)) {
    if (q.trim()) n += 1;
  }
  return n;
}

export function tinhMatchesColumnSearch(
  row: TinhThanh,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    const key = colId as keyof TinhThanh;
    const raw = row[key];
    const str = raw == null ? '' : String(raw);
    if (!str.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}

export function xaMatchesColumnSearch(
  row: XaPhuong,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    const key = colId as keyof XaPhuong;
    const raw = row[key];
    const str = raw == null ? '' : String(raw);
    if (!str.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}

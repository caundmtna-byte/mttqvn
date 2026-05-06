import type { BaiVietThietLapKhac } from '../core/types';

export function countKhacColumnSearchActive(columnSearch: Record<string, string> | undefined): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const q of Object.values(columnSearch)) {
    if (q.trim()) n += 1;
  }
  return n;
}

export function khacMatchesColumnSearch(
  row: BaiVietThietLapKhac,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    const key = colId as keyof BaiVietThietLapKhac;
    const v = row[key];
    const raw = v == null ? '' : String(v);
    if (!raw.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}

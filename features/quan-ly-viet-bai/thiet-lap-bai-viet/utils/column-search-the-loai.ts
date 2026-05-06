import type { BaiVietTheLoai } from '../core/types';

export function countTheLoaiColumnSearchActive(columnSearch: Record<string, string> | undefined): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const q of Object.values(columnSearch)) {
    if (q.trim()) n += 1;
  }
  return n;
}

export function theLoaiMatchesColumnSearch(
  row: BaiVietTheLoai,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    let raw: string;
    if (colId === 'don_gia') {
      raw = String(row.don_gia ?? '');
    } else {
      const key = colId as keyof BaiVietTheLoai;
      const v = row[key];
      raw = v == null ? '' : String(v);
    }
    if (!raw.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}

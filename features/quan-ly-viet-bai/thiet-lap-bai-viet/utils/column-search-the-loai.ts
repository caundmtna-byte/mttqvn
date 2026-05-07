import type { ArticleTheLoaiFilters, BaiVietTheLoai } from '../core/types';

export function countTheLoaiColumnSearchActive(
  columnSearch: Record<string, string> | undefined,
  donGiaBucket: ArticleTheLoaiFilters['don_gia_bucket'] | undefined,
): number {
  if (!columnSearch) return 0;
  let n = 0;
  const skipDonGia = donGiaBucket === 'free' || donGiaBucket === 'paid';
  for (const [colId, q] of Object.entries(columnSearch)) {
    if (!q.trim()) continue;
    if (skipDonGia && colId === 'don_gia') continue;
    n += 1;
  }
  return n;
}

export function theLoaiMatchesColumnSearch(
  row: BaiVietTheLoai,
  columnSearch: Record<string, string> | undefined,
  donGiaBucket?: ArticleTheLoaiFilters['don_gia_bucket'],
): boolean {
  if (!columnSearch) return true;
  const skipDonGia = donGiaBucket === 'free' || donGiaBucket === 'paid';
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    if (skipDonGia && colId === 'don_gia') continue;
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

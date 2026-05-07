import type { BaiVietDanhSach, BaiVietDanhSachFilters } from '../core/types';

export function baiVietMatchesColumnSearch(
  item: BaiVietDanhSach,
  f: Pick<BaiVietDanhSachFilters, 'columnSearch' | 'id_the_loai'>,
): boolean {
  const { columnSearch, id_the_loai } = f;
  for (const [colId, term] of Object.entries(columnSearch)) {
    const t = term.trim();
    if (!t) continue;
    if (colId === 'ten_the_loai' && id_the_loai?.length) continue;
    const raw = (item as unknown as Record<string, unknown>)[colId];
    const s = raw == null ? '' : String(raw).toLowerCase();
    if (!s.includes(t.toLowerCase())) return false;
  }
  return true;
}

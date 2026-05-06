import type { BaiVietDanhSach } from '../core/types';

export function baiVietMatchesColumnSearch(item: BaiVietDanhSach, columnSearch: Record<string, string>): boolean {
  for (const [colId, term] of Object.entries(columnSearch)) {
    const t = term.trim();
    if (!t) continue;
    const raw = (item as unknown as Record<string, unknown>)[colId];
    const s = raw == null ? '' : String(raw).toLowerCase();
    if (!s.includes(t.toLowerCase())) return false;
  }
  return true;
}

import type { MttqCanBoFilters, MttqCanBoRow } from '../core/types';

export function mttqCanBoMatchesColumnSearch(
  item: MttqCanBoRow,
  f: Pick<MttqCanBoFilters, 'columnSearch' | 'trang_thai_id' | 'gioi_tinh'>,
): boolean {
  const { columnSearch, trang_thai_id, gioi_tinh } = f;
  for (const [colId, term] of Object.entries(columnSearch)) {
    const t = term.trim();
    if (!t) continue;
    if (colId === 'ten_trang_thai' && trang_thai_id?.length) continue;
    if (colId === 'gioi_tinh' && gioi_tinh?.length) continue;
    const raw = (item as unknown as Record<string, unknown>)[colId];
    let s: string;
    if (typeof raw === 'boolean') {
      s = raw ? '1' : '0';
    } else {
      s = raw == null ? '' : String(raw).toLowerCase();
    }
    if (!s.includes(t.toLowerCase())) return false;
  }
  return true;
}

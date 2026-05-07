import type { CongViecDanhSachFilters, CongViecDanhSachRow } from '../core/types';
import { formatCongViecTienDoTheoHan } from './deadline-progress';

export function congViecMatchesColumnSearch(
  item: CongViecDanhSachRow,
  f: Pick<CongViecDanhSachFilters, 'columnSearch' | 'trang_thai' | 'muc_do'>,
): boolean {
  const { columnSearch, trang_thai, muc_do } = f;
  for (const [colId, term] of Object.entries(columnSearch)) {
    const t = term.trim();
    if (!t) continue;
    if (colId === 'trang_thai' && trang_thai?.length) continue;
    if (colId === 'muc_do' && muc_do?.length) continue;
    if (colId === 'tien_do') {
      const label = formatCongViecTienDoTheoHan(item.thoi_han, item.trang_thai).toLowerCase();
      if (!label.includes(t.toLowerCase())) return false;
      continue;
    }
    const raw = (item as unknown as Record<string, unknown>)[colId];
    const s = raw == null ? '' : String(raw).toLowerCase();
    if (!s.includes(t.toLowerCase())) return false;
  }
  return true;
}

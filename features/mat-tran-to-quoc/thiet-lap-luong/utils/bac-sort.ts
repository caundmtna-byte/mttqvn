import type { LuongThietLapBacRow } from '../core/types';
import type { SortState } from '@/store/createGenericStore';

function cmpStr(a: string | null | undefined, b: string | null | undefined, dir: 'asc' | 'desc'): number {
  const sa = (a ?? '').toLowerCase();
  const sb = (b ?? '').toLowerCase();
  const base = sa.localeCompare(sb, 'vi');
  return dir === 'desc' ? -base : base;
}

function cmpNum(a: number, b: number, dir: 'asc' | 'desc'): number {
  const base = a === b ? 0 : a < b ? -1 : 1;
  return dir === 'desc' ? -base : base;
}

export type LuongBacTableRow = LuongThietLapBacRow & {
  luong_preview: number;
  /** Hệ số đang hiển thị (draft hoặc server), dùng sort / lọc. */
  he_so_effective: number;
  he_so_display: string;
  luong_search: string;
};

export function sortLuongBacRows(rows: LuongBacTableRow[], sort: SortState): LuongBacTableRow[] {
  if (!sort.column || !sort.direction) {
    return [...rows].sort((a, b) => a.thu_tu - b.thu_tu);
  }
  const dir = sort.direction;
  const col = sort.column;
  const list = [...rows];
  list.sort((a, b) => {
    switch (col) {
      case 'ma_bac':
        return cmpStr(a.ma_bac, b.ma_bac, dir);
      case 'he_so':
        return cmpNum(a.he_so_effective, b.he_so_effective, dir);
      case 'luong':
        return cmpNum(a.luong_preview, b.luong_preview, dir);
      case 'thu_tu':
        return cmpNum(a.thu_tu, b.thu_tu, dir);
      default:
        return a.thu_tu - b.thu_tu;
    }
  });
  return list;
}

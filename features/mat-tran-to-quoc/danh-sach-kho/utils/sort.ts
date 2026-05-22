import type { KhoDanhSachKhoListRow } from '../core/types';
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

function cmpTime(a: string | null | undefined, b: string | null | undefined, dir: 'asc' | 'desc'): number {
  const ta = a ? new Date(a).getTime() : 0;
  const tb = b ? new Date(b).getTime() : 0;
  const base = ta === tb ? 0 : ta < tb ? -1 : 1;
  return dir === 'desc' ? -base : base;
}

/** Sắp xếp client sau filter — đồng bộ với header sort. */
export function sortKhoDanhSachKhoList(rows: KhoDanhSachKhoListRow[], sort: SortState): KhoDanhSachKhoListRow[] {
  if (!sort.column || !sort.direction) return rows;
  const dir = sort.direction;
  const col = sort.column;
  const list = [...rows];
  list.sort((a, b) => {
    switch (col) {
      case 'tt':
        return cmpNum(a.tt, b.tt, dir);
      case 'ten_kho':
        return cmpStr(a.ten_kho, b.ten_kho, dir);
      case 'ten_don_vi':
        return cmpStr(a.ten_don_vi, b.ten_don_vi, dir);
      case 'ten_tinh':
        return cmpStr(a.ten_tinh, b.ten_tinh, dir);
      case 'mo_ta':
        return cmpStr(a.mo_ta, b.mo_ta, dir);
      case 'tg_tao':
        return cmpTime(a.tg_tao, b.tg_tao, dir);
      case 'tg_cap_nhat':
        return cmpTime(a.tg_cap_nhat, b.tg_cap_nhat, dir);
      default:
        return cmpStr(a.ten_kho, b.ten_kho, dir);
    }
  });
  return list;
}

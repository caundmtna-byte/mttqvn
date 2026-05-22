import type { KhoDotCuuTroListRow } from '../core/types';
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

export function sortKhoDotCuuTroList(rows: KhoDotCuuTroListRow[], sort: SortState): KhoDotCuuTroListRow[] {
  if (!sort.column || !sort.direction) return rows;
  const dir = sort.direction;
  const col = sort.column;
  const list = [...rows];
  list.sort((a, b) => {
    switch (col) {
      case 'tt':
        return cmpNum(a.tt, b.tt, dir);
      case 'ten':
        return cmpStr(a.ten, b.ten, dir);
      case 'link':
        return cmpStr(a.link, b.link, dir);
      case 'tg_tao':
        return cmpTime(a.tg_tao, b.tg_tao, dir);
      case 'tg_cap_nhat':
        return cmpTime(a.tg_cap_nhat, b.tg_cap_nhat, dir);
      default:
        return cmpStr(a.ten, b.ten, dir);
    }
  });
  return list;
}

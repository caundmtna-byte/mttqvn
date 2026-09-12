import type { SortState } from '@/store/createGenericStore';
import { QUY_LOAI_KHOAN_LABEL } from '../../core/constants';
import type { QuyDanhMucKhoanListRow } from '../core/types';

function cmpStr(a: string | null | undefined, b: string | null | undefined, dir: 'asc' | 'desc') {
  const base = (a ?? '').toLowerCase().localeCompare((b ?? '').toLowerCase(), 'vi');
  return dir === 'desc' ? -base : base;
}

function cmpNum(a: number, b: number, dir: 'asc' | 'desc') {
  const base = a === b ? 0 : a < b ? -1 : 1;
  return dir === 'desc' ? -base : base;
}

function cmpTime(a: string | null | undefined, b: string | null | undefined, dir: 'asc' | 'desc') {
  const ta = a ? new Date(a).getTime() : 0;
  const tb = b ? new Date(b).getTime() : 0;
  const base = ta === tb ? 0 : ta < tb ? -1 : 1;
  return dir === 'desc' ? -base : base;
}

export function sortQuyKhoanList(
  rows: QuyDanhMucKhoanListRow[],
  sort: SortState,
): QuyDanhMucKhoanListRow[] {
  if (!sort.column || !sort.direction) return rows;
  const dir = sort.direction;
  const col = sort.column;
  return [...rows].sort((a, b) => {
    switch (col) {
      case 'thu_tu':
        return cmpNum(a.thu_tu, b.thu_tu, dir);
      case 'loai':
        return cmpStr(QUY_LOAI_KHOAN_LABEL[a.loai], QUY_LOAI_KHOAN_LABEL[b.loai], dir);
      case 'ten':
        return cmpStr(a.ten, b.ten, dir);
      case 'mo_ta':
        return cmpStr(a.mo_ta, b.mo_ta, dir);
      case 'trang_thai':
        return cmpStr(a.trang_thai, b.trang_thai, dir);
      case 'tg_tao':
        return cmpTime(a.tg_tao, b.tg_tao, dir);
      case 'tg_cap_nhat':
        return cmpTime(a.tg_cap_nhat, b.tg_cap_nhat, dir);
      default:
        return cmpNum(a.thu_tu, b.thu_tu, dir);
    }
  });
}

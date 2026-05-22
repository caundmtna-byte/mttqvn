import type { SortState } from '@/store/createGenericStore';
import type { KhoDanhMucHangHoaListRow, KhoDanhSachHangHoaListRow } from '../core/types';

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

export function sortDanhMucHangHoaList(rows: KhoDanhMucHangHoaListRow[], sort: SortState): KhoDanhMucHangHoaListRow[] {
  if (!sort.column || !sort.direction) return rows;
  const dir = sort.direction;
  const col = sort.column;
  const list = [...rows];
  list.sort((a, b) => {
    switch (col) {
      case 'thu_tu':
        return cmpNum(a.thu_tu, b.thu_tu, dir);
      case 'ten_danh_muc':
        return cmpStr(a.ten_danh_muc, b.ten_danh_muc, dir);
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
  return list;
}

export function sortHangHoaList(rows: KhoDanhSachHangHoaListRow[], sort: SortState): KhoDanhSachHangHoaListRow[] {
  if (!sort.column || !sort.direction) return rows;
  const dir = sort.direction;
  const col = sort.column;
  const list = [...rows];
  list.sort((a, b) => {
    switch (col) {
      case 'ten_danh_muc_nhom':
        return cmpStr(a.ten_danh_muc_nhom, b.ten_danh_muc_nhom, dir);
      case 'ten_hang_hoa':
        return cmpStr(a.ten_hang_hoa, b.ten_hang_hoa, dir);
      case 'don_vi_tinh':
        return cmpStr(a.don_vi_tinh, b.don_vi_tinh, dir);
      case 'quy_cach':
        return cmpStr(a.quy_cach, b.quy_cach, dir);
      case 'mo_ta':
        return cmpStr(a.mo_ta, b.mo_ta, dir);
      case 'thu_tu':
        return cmpNum(a.thu_tu, b.thu_tu, dir);
      case 'trang_thai':
        return cmpStr(a.trang_thai, b.trang_thai, dir);
      case 'tg_tao':
        return cmpTime(a.tg_tao, b.tg_tao, dir);
      case 'tg_cap_nhat':
        return cmpTime(a.tg_cap_nhat, b.tg_cap_nhat, dir);
      default:
        return cmpStr(a.ten_hang_hoa, b.ten_hang_hoa, dir);
    }
  });
  return list;
}

import type { NhapXuatKhoCtFlatRow, NhapXuatKhoListRow } from '../core/types';
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

function cmpDateStr(a: string | null | undefined, b: string | null | undefined, dir: 'asc' | 'desc'): number {
  const sa = a ?? '';
  const sb = b ?? '';
  const base = sa === sb ? 0 : sa < sb ? -1 : 1;
  return dir === 'desc' ? -base : base;
}

export function sortNhapXuatKhoList(rows: NhapXuatKhoListRow[], sort: SortState): NhapXuatKhoListRow[] {
  if (!sort.column || !sort.direction) {
    return [...rows].sort((a, b) => {
      const d = cmpDateStr(a.ngay_phieu, b.ngay_phieu, 'desc');
      if (d !== 0) return d;
      return cmpStr(a.so_phieu, b.so_phieu, 'desc');
    });
  }
  const dir = sort.direction;
  const col = sort.column;
  const list = [...rows];
  list.sort((a, b) => {
    switch (col) {
      case 'tt':
        return cmpNum(a.tt, b.tt, dir);
      case 'so_phieu':
        return cmpStr(a.so_phieu, b.so_phieu, dir);
      case 'loai_phieu':
        return cmpStr(a.loai_phieu, b.loai_phieu, dir);
      case 'ngay_phieu':
        return cmpDateStr(a.ngay_phieu, b.ngay_phieu, dir);
      case 'ten_kho_xuat':
        return cmpStr(a.ten_kho_xuat, b.ten_kho_xuat, dir);
      case 'ten_kho_nhap':
        return cmpStr(a.ten_kho_nhap, b.ten_kho_nhap, dir);
      case 'ten_don_vi_cuu_tro':
        return cmpStr(a.ten_don_vi_cuu_tro, b.ten_don_vi_cuu_tro, dir);
      case 'ten_dot_cuu_tro':
        return cmpStr(a.ten_dot_cuu_tro, b.ten_dot_cuu_tro, dir);
      case 'so_dong':
        return cmpNum(a.so_dong, b.so_dong, dir);
      case 'tg_tao':
        return cmpDateStr(a.tg_tao, b.tg_tao, dir);
      case 'tg_cap_nhat':
        return cmpDateStr(a.tg_cap_nhat, b.tg_cap_nhat, dir);
      default:
        return cmpStr(a.so_phieu, b.so_phieu, dir);
    }
  });
  return list;
}

export function sortNhapXuatKhoCtFlat(rows: NhapXuatKhoCtFlatRow[], sort: SortState): NhapXuatKhoCtFlatRow[] {
  if (!sort.column || !sort.direction) {
    return [...rows].sort((a, b) => {
      const d = cmpDateStr(a.ngay_phieu, b.ngay_phieu, 'desc');
      if (d !== 0) return d;
      return cmpStr(a.so_phieu, b.so_phieu, 'desc');
    });
  }
  const dir = sort.direction;
  const col = sort.column;
  const list = [...rows];
  list.sort((a, b) => {
    switch (col) {
      case 'so_phieu':
        return cmpStr(a.so_phieu, b.so_phieu, dir);
      case 'loai_phieu':
        return cmpStr(a.loai_phieu, b.loai_phieu, dir);
      case 'ngay_phieu':
        return cmpDateStr(a.ngay_phieu, b.ngay_phieu, dir);
      case 'ten_hang_hoa':
        return cmpStr(a.ten_hang_hoa, b.ten_hang_hoa, dir);
      case 'don_vi_tinh':
        return cmpStr(a.don_vi_tinh, b.don_vi_tinh, dir);
      case 'so_luong':
        return cmpNum(a.so_luong, b.so_luong, dir);
      case 'don_gia':
        return cmpNum(a.don_gia, b.don_gia, dir);
      case 'thanh_tien':
        return cmpNum(a.thanh_tien, b.thanh_tien, dir);
      case 'ten_kho_xuat':
        return cmpStr(a.ten_kho_xuat, b.ten_kho_xuat, dir);
      case 'ten_kho_nhap':
        return cmpStr(a.ten_kho_nhap, b.ten_kho_nhap, dir);
      default:
        return cmpStr(a.so_phieu, b.so_phieu, dir);
    }
  });
  return list;
}

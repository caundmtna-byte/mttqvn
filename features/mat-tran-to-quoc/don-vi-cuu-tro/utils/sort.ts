import type { KhoDonViCuuTroListRow } from '../core/types';
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

/**
 * `so_nguoi` để trống KHÁC "0 người" nên không ép `?? 0`; dòng trống xuống cuối ở
 * cả hai chiều, khớp quy ước NULLS LAST của các RPC trong repo.
 */
function cmpNumNullable(a: number | null, b: number | null, dir: 'asc' | 'desc'): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return cmpNum(a, b, dir);
}

function cmpTime(a: string | null | undefined, b: string | null | undefined, dir: 'asc' | 'desc'): number {
  const ta = a ? new Date(a).getTime() : 0;
  const tb = b ? new Date(b).getTime() : 0;
  const base = ta === tb ? 0 : ta < tb ? -1 : 1;
  return dir === 'desc' ? -base : base;
}

export function sortKhoDonViCuuTroList(rows: KhoDonViCuuTroListRow[], sort: SortState): KhoDonViCuuTroListRow[] {
  if (!sort.column || !sort.direction) return rows;
  const dir = sort.direction;
  const col = sort.column;
  const list = [...rows];
  list.sort((a, b) => {
    switch (col) {
      case 'tt':
        return cmpNum(a.tt, b.tt, dir);
      case 'loai':
        return cmpStr(a.loai_label, b.loai_label, dir);
      case 'ten':
        return cmpStr(a.ten, b.ten, dir);
      case 'so_nguoi':
        return cmpNumNullable(a.so_nguoi, b.so_nguoi, dir);
      case 'nguoi_dai_dien':
        return cmpStr(a.nguoi_dai_dien, b.nguoi_dai_dien, dir);
      case 'chuc_vu':
        return cmpStr(a.chuc_vu, b.chuc_vu, dir);
      case 'don_vi_gioi_thieu':
        return cmpStr(a.don_vi_gioi_thieu_label, b.don_vi_gioi_thieu_label, dir);
      case 'dia_chi':
        return cmpStr(a.dia_chi, b.dia_chi, dir);
      case 'dien_thoai':
        return cmpStr(a.dien_thoai, b.dien_thoai, dir);
      case 'email':
        return cmpStr(a.email, b.email, dir);
      case 'ghi_chu':
        return cmpStr(a.ghi_chu, b.ghi_chu, dir);
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

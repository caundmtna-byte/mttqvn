import type { SortState } from '@/store/createGenericStore';
import type { DipThamHoi } from '../core/types';
import { formatDonViToChucDisplay } from '../core/display-don-vi';

function compareStr(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? '').localeCompare(b ?? '', 'vi');
}

function compareNum(a: number, b: number): number {
  return a - b;
}

export function sortDipThamHoiList(rows: DipThamHoi[], sort: SortState): DipThamHoi[] {
  if (!sort.column || !sort.direction) return rows;
  const dir = sort.direction === 'asc' ? 1 : -1;
  const col = sort.column;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (col) {
      case 'ten_dip':
        cmp = compareStr(a.ten_dip, b.ten_dip);
        break;
      case 'thoi_gian_du_kien':
        cmp = compareStr(a.thoi_gian_du_kien, b.thoi_gian_du_kien);
        break;
      case 'thoi_gian_thuc_te':
        cmp = compareStr(a.thoi_gian_thuc_te, b.thoi_gian_thuc_te);
        break;
      case 'don_vi_to_chuc':
        cmp = compareStr(formatDonViToChucDisplay(a), formatDonViToChucDisplay(b));
        break;
      case 'phong_ban_tham_muu':
        cmp = compareStr(a.ten_phong_ban, b.ten_phong_ban);
        break;
      case 'so_luong_du_kien_tong':
        cmp = compareNum(a.so_luong_du_kien_tong, b.so_luong_du_kien_tong);
        break;
      case 'so_luong_thuc_te_tong':
        cmp = compareNum(a.so_luong_thuc_te_tong, b.so_luong_thuc_te_tong);
        break;
      case 'so_luong_to_chuc_du_kien':
        cmp = compareNum(a.so_luong_to_chuc_du_kien, b.so_luong_to_chuc_du_kien);
        break;
      case 'so_luong_ca_nhan_du_kien':
        cmp = compareNum(a.so_luong_ca_nhan_du_kien, b.so_luong_ca_nhan_du_kien);
        break;
      case 'trang_thai':
        cmp = compareStr(a.trang_thai, b.trang_thai);
        break;
      case 'tg_cap_nhat':
        cmp = compareStr(a.tg_cap_nhat, b.tg_cap_nhat);
        break;
      default:
        cmp = 0;
    }
    return cmp * dir;
  });
}

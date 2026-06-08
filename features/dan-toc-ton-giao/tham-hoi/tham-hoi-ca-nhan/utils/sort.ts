import type { SortState } from '@/store/createGenericStore';
import { formatDonViThamHoiDisplay } from '../core/display-don-vi';
import type { ThamHoiCaNhan } from '../core/types';
import { formatThoiGianDuKienDisplay } from './thoi-gian-du-kien';

function compareStr(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? '').localeCompare(b ?? '', 'vi');
}

export function sortThamHoiCaNhanList(rows: ThamHoiCaNhan[], sort: SortState): ThamHoiCaNhan[] {
  if (!sort.column || !sort.direction) return rows;
  const dir = sort.direction === 'asc' ? 1 : -1;
  const col = sort.column;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (col) {
      case 'ho_va_ten':
        cmp = compareStr(a.ho_va_ten, b.ho_va_ten);
        break;
      case 'dip_tham_hoi':
        cmp = compareStr(a.dip_tham_hoi, b.dip_tham_hoi);
        break;
      case 'thoi_gian_du_kien':
        cmp = compareStr(a.thoi_gian_du_kien, b.thoi_gian_du_kien);
        break;
      case 'don_vi_tham_hoi':
        cmp = compareStr(formatDonViThamHoiDisplay(a), formatDonViThamHoiDisplay(b));
        break;
      case 'ten_phong_ban':
        cmp = compareStr(a.ten_phong_ban, b.ten_phong_ban);
        break;
      case 'ten_xa_phuong':
        cmp = compareStr(a.ten_xa_phuong, b.ten_xa_phuong);
        break;
      case 'trang_thai':
        cmp = compareStr(a.trang_thai, b.trang_thai);
        break;
      case 'ket_qua_ghi_chu':
        cmp = compareStr(a.ket_qua_ghi_chu, b.ket_qua_ghi_chu);
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

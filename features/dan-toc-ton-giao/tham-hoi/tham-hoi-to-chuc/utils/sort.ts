import type { SortState } from '@/store/createGenericStore';
import type { ThamHoiToChuc } from '../core/types';
import { formatDonViThamHoiDisplay } from '../core/display-don-vi';

function compareStr(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? '').localeCompare(b ?? '', 'vi');
}

export function sortThamHoiToChucList(rows: ThamHoiToChuc[], sort: SortState): ThamHoiToChuc[] {
  if (!sort.column || !sort.direction) return rows;
  const dir = sort.direction === 'asc' ? 1 : -1;
  const col = sort.column;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (col) {
      case 'ten_co_so':
        cmp = compareStr(a.ten_co_so, b.ten_co_so);
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
      case 'tien_do':
        cmp = compareStr(a.tien_do, b.tien_do);
        break;
      case 'ket_qua_thuc_hien':
        cmp = compareStr(a.ket_qua_thuc_hien, b.ket_qua_thuc_hien);
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

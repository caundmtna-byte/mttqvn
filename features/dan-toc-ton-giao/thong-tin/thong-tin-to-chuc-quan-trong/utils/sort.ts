import type { SortState } from '@/store/createGenericStore';
import type { ThongTinToChucQuanTrong } from '../core/types';

function compareStr(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? '').localeCompare(b ?? '', 'vi');
}

export function sortThongTinToChucQuanTrongList(
  rows: ThongTinToChucQuanTrong[],
  sort: SortState,
): ThongTinToChucQuanTrong[] {
  if (!sort.column || !sort.direction) return rows;
  const dir = sort.direction === 'asc' ? 1 : -1;
  const col = sort.column;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (col) {
      case 'loai_hinh':
        cmp = compareStr(a.loai_hinh, b.loai_hinh);
        break;
      case 'ten_co_so':
        cmp = compareStr(a.ten_co_so, b.ten_co_so);
        break;
      case 'chu_tri':
        cmp = compareStr(a.chu_tri, b.chu_tri);
        break;
      case 'ten_don_vi':
        cmp = compareStr(a.ten_don_vi, b.ten_don_vi);
        break;
      case 'so_dien_thoai':
        cmp = compareStr(a.so_dien_thoai, b.so_dien_thoai);
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

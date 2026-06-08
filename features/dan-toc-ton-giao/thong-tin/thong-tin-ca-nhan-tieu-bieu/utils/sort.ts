import type { SortState } from '@/store/createGenericStore';
import type { ThongTinCaNhanTieuBieu } from '../core/types';

function compareStr(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? '').localeCompare(b ?? '', 'vi');
}

export function sortThongTinCaNhanTieuBieuList(
  rows: ThongTinCaNhanTieuBieu[],
  sort: SortState,
): ThongTinCaNhanTieuBieu[] {
  if (!sort.column || !sort.direction) return rows;
  const dir = sort.direction === 'asc' ? 1 : -1;
  const col = sort.column;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (col) {
      case 'ho_va_ten':
        cmp = compareStr(a.ho_va_ten, b.ho_va_ten);
        break;
      case 'doi_tuong':
        cmp = compareStr(a.doi_tuong, b.doi_tuong);
        break;
      case 'chuc_vu_vi_tri':
        cmp = compareStr(a.chuc_vu_vi_tri, b.chuc_vu_vi_tri);
        break;
      case 'ton_giao_dan_toc':
        cmp = compareStr(a.ton_giao_dan_toc, b.ton_giao_dan_toc);
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

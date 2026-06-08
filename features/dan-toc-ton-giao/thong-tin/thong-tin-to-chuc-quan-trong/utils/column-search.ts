import type { ThongTinToChucQuanTrong } from '../core/types';

export function countThongTinToChucQuanTrongColumnSearchActive(
  columnSearch: Record<string, string> | undefined,
): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const [, q] of Object.entries(columnSearch)) {
    if (q.trim()) n += 1;
  }
  return n;
}

export function thongTinToChucQuanTrongMatchesColumnSearch(
  row: ThongTinToChucQuanTrong,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    let haystack = '';
    switch (colId) {
      case 'loai_hinh':
        haystack = row.loai_hinh ?? '';
        break;
      case 'ten_co_so':
        haystack = row.ten_co_so ?? '';
        break;
      case 'chu_tri':
        haystack = row.chu_tri ?? '';
        break;
      case 'ten_don_vi':
        haystack = row.ten_don_vi ?? '';
        break;
      case 'ten_tinh':
        haystack = row.ten_tinh ?? '';
        break;
      case 'so_dien_thoai':
        haystack = row.so_dien_thoai ?? '';
        break;
      case 'lich_su_hinh_thanh':
        haystack = row.lich_su_hinh_thanh ?? '';
        break;
      case 'cong_tac_an_sinh':
        haystack = row.cong_tac_an_sinh ?? '';
        break;
      case 'dia_chi':
        haystack = row.dia_chi ?? '';
        break;
      case 'trang_thai':
        haystack = row.trang_thai ?? '';
        break;
      case 'tg_cap_nhat':
        haystack = row.tg_cap_nhat ?? '';
        break;
      default:
        haystack = '';
    }
    if (!haystack.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}

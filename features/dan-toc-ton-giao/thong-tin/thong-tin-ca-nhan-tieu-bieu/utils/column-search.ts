import type { ThongTinCaNhanTieuBieu } from '../core/types';

export function countThongTinCaNhanTieuBieuColumnSearchActive(
  columnSearch: Record<string, string> | undefined,
): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const [, q] of Object.entries(columnSearch)) {
    if (q.trim()) n += 1;
  }
  return n;
}

export function thongTinCaNhanTieuBieuMatchesColumnSearch(
  row: ThongTinCaNhanTieuBieu,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    let haystack = '';
    switch (colId) {
      case 'ho_va_ten':
        haystack = row.ho_va_ten ?? '';
        break;
      case 'doi_tuong':
        haystack = row.doi_tuong ?? '';
        break;
      case 'chuc_vu_vi_tri':
        haystack = row.chuc_vu_vi_tri ?? '';
        break;
      case 'ton_giao_dan_toc':
        haystack = row.ton_giao_dan_toc ?? '';
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
      case 'dong_gop_noi_bat':
        haystack = row.dong_gop_noi_bat ?? '';
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

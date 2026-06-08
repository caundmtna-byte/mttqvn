import type { ThamHoiToChuc } from '../core/types';

export function countThamHoiToChucColumnSearchActive(
  columnSearch: Record<string, string> | undefined,
): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const [, q] of Object.entries(columnSearch)) {
    if (q.trim()) n += 1;
  }
  return n;
}

export function thamHoiToChucMatchesColumnSearch(
  row: ThamHoiToChuc,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    let haystack = '';
    switch (colId) {
      case 'ten_co_so':
        haystack = row.ten_co_so ?? '';
        break;
      case 'dip_tham_hoi':
        haystack = row.dip_tham_hoi ?? '';
        break;
      case 'thoi_gian_du_kien':
        haystack = row.thoi_gian_du_kien ?? '';
        break;
      case 'don_vi_tham_hoi':
        haystack = row.don_vi_tham_hoi ?? '';
        break;
      case 'noi_dung_tham_hoi':
        haystack = row.noi_dung_tham_hoi ?? '';
        break;
      case 'thanh_phan_doan':
        haystack = row.thanh_phan_doan ?? '';
        break;
      case 'qua_tang':
        haystack = row.qua_tang ?? '';
        break;
      case 'tien_do':
        haystack = row.tien_do ?? '';
        break;
      case 'ket_qua_thuc_hien':
        haystack = row.ket_qua_thuc_hien ?? '';
        break;
      case 'link_ket_qua':
        haystack = row.link_ket_qua ?? '';
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

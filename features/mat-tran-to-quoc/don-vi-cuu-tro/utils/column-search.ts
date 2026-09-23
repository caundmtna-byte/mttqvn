import type { KhoDonViCuuTroListRow } from '../core/types';

export function countKhoDonViCuuTroColumnSearchActive(columnSearch: Record<string, string> | undefined): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const [, q] of Object.entries(columnSearch)) {
    if (q.trim()) n += 1;
  }
  return n;
}

export function khoDonViCuuTroMatchesColumnSearch(
  row: KhoDonViCuuTroListRow,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    let haystack = '';
    switch (colId) {
      case 'tt':
        haystack = String(row.tt ?? '');
        break;
      case 'loai':
        haystack = `${row.loai ?? ''} ${row.loai_label ?? ''}`;
        break;
      case 'ten':
        haystack = row.ten ?? '';
        break;
      case 'so_nguoi':
        haystack = row.so_nguoi == null ? '' : String(row.so_nguoi);
        break;
      case 'nguoi_dai_dien':
        haystack = row.nguoi_dai_dien ?? '';
        break;
      case 'chuc_vu':
        haystack = row.chuc_vu ?? '';
        break;
      case 'don_vi_gioi_thieu':
        haystack = row.don_vi_gioi_thieu_label ?? '';
        break;
      case 'dia_chi':
        haystack = row.dia_chi ?? '';
        break;
      case 'dien_thoai':
        haystack = row.dien_thoai ?? '';
        break;
      case 'email':
        haystack = row.email ?? '';
        break;
      case 'ghi_chu':
        haystack = row.ghi_chu ?? '';
        break;
      case 'tg_tao':
        haystack = row.tg_tao ?? '';
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

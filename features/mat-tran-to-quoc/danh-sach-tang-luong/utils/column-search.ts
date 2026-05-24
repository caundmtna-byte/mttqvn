import type { MttqTangLuongListRow } from '../core/types';

export function countTangLuongColumnSearchActive(columnSearch: Record<string, string> | undefined): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const [, q] of Object.entries(columnSearch)) {
    if (q.trim()) n += 1;
  }
  return n;
}

export function tangLuongMatchesColumnSearch(
  row: MttqTangLuongListRow & { loai_ky_label?: string },
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    let haystack = '';
    switch (colId) {
      case 'ngay_nang_luong':
        haystack = row.ngay_nang_luong ?? '';
        break;
      case 'ho_ten_can_bo':
        haystack = row.ho_ten_can_bo ?? '';
        break;
      case 'loai_ky':
        haystack = row.loai_ky_label ?? row.loai_ky ?? '';
        break;
      case 'ten_ngach_moi':
        haystack = `${row.ten_ngach_moi ?? ''} ${row.ma_bac_moi ?? ''}`;
        break;
      case 'luong':
        haystack = `${row.luong ?? 0}`;
        break;
      case 'ten_ngach_cu':
        haystack = `${row.ten_ngach_cu ?? ''} ${row.ma_bac_cu ?? ''}`;
        break;
      case 'ghi_chu':
        haystack = row.ghi_chu ?? '';
        break;
      default:
        haystack = '';
    }
    if (!haystack.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}

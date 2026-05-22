import type { NhapXuatKhoCtFlatRow, NhapXuatKhoListRow } from '../core/types';

export function countColumnSearchActive(columnSearch: Record<string, string> | undefined): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const [, q] of Object.entries(columnSearch)) {
    if (q.trim()) n += 1;
  }
  return n;
}

export function nhapXuatKhoMatchesColumnSearch(
  row: NhapXuatKhoListRow,
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
      case 'so_phieu':
        haystack = row.so_phieu ?? '';
        break;
      case 'loai_phieu':
        haystack = row.loai_phieu ?? '';
        break;
      case 'ngay_phieu':
        haystack = row.ngay_phieu ?? '';
        break;
      case 'ten_kho_xuat':
        haystack = row.ten_kho_xuat ?? '';
        break;
      case 'ten_kho_nhap':
        haystack = row.ten_kho_nhap ?? '';
        break;
      case 'ten_don_vi_cuu_tro':
        haystack = row.ten_don_vi_cuu_tro ?? '';
        break;
      case 'ten_dot_cuu_tro':
        haystack = row.ten_dot_cuu_tro ?? '';
        break;
      case 'so_dong':
        haystack = String(row.so_dong ?? '');
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

export function nhapXuatKhoCtMatchesColumnSearch(
  row: NhapXuatKhoCtFlatRow,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    let haystack = '';
    switch (colId) {
      case 'so_phieu':
        haystack = row.so_phieu ?? '';
        break;
      case 'loai_phieu':
        haystack = row.loai_phieu ?? '';
        break;
      case 'ngay_phieu':
        haystack = row.ngay_phieu ?? '';
        break;
      case 'ten_hang_hoa':
        haystack = row.ten_hang_hoa ?? '';
        break;
      case 'don_vi_tinh':
        haystack = row.don_vi_tinh ?? '';
        break;
      case 'so_luong':
        haystack = String(row.so_luong ?? '');
        break;
      case 'don_gia':
        haystack = String(row.don_gia ?? '');
        break;
      case 'thanh_tien':
        haystack = String(row.thanh_tien ?? '');
        break;
      case 'ten_kho_xuat':
        haystack = row.ten_kho_xuat ?? '';
        break;
      case 'ten_kho_nhap':
        haystack = row.ten_kho_nhap ?? '';
        break;
      case 'ten_don_vi_cuu_tro':
        haystack = row.ten_don_vi_cuu_tro ?? '';
        break;
      case 'ten_dot_cuu_tro':
        haystack = row.ten_dot_cuu_tro ?? '';
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

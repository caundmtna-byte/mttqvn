import { txt } from '@/lib/text';
import type { QuyDanhMucTaiKhoanListRow } from '../core/types';

export function countQuyTaiKhoanColumnSearchActive(
  columnSearch: Record<string, string> | undefined,
): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const [, q] of Object.entries(columnSearch)) {
    if (q.trim()) n += 1;
  }
  return n;
}

/** Tài khoản không có số tài khoản ⇒ coi là quỹ tiền mặt. */
export function hinhThucTaiKhoan(row: QuyDanhMucTaiKhoanListRow): 'tien_mat' | 'ngan_hang' {
  return row.so_tai_khoan?.trim() ? 'ngan_hang' : 'tien_mat';
}

export function quyTaiKhoanMatchesColumnSearch(
  row: QuyDanhMucTaiKhoanListRow,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    let haystack = '';
    switch (colId) {
      case 'thu_tu':
        haystack = String(row.thu_tu ?? '');
        break;
      case 'ten':
        haystack = row.ten ?? '';
        break;
      case 'so_tai_khoan':
        haystack = row.so_tai_khoan ?? '';
        break;
      case 'ngan_hang':
        haystack = row.ngan_hang ?? '';
        break;
      case 'mo_ta':
        haystack = row.mo_ta ?? '';
        break;
      case 'trang_thai':
        haystack = row.trang_thai ?? '';
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

/** Nhãn hình thức để hiện trên chip lọc. */
export function hinhThucLabel(value: 'tien_mat' | 'ngan_hang'): string {
  return value === 'ngan_hang'
    ? txt('quy.danhMucTaiKhoan.filter.loaiNguonNganHang')
    : txt('quy.danhMucTaiKhoan.filter.loaiNguonTienMat');
}

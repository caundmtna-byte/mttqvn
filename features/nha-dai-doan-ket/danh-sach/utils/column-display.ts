import type { NhaDaiDoanKet } from '../core/types';
import {
  formatNddkDateTimeDisplay,
  formatNddkNgayDisplay,
  formatNddkNguoiTaoDisplay,
  formatNddkSoTienDisplay,
  trimmedNddkDisplay,
} from './display-format';

/** Chuỗi hiển thị của một cột — dùng chung cho bảng và cho file xuất. */
export function getNddkColumnDisplayValue(item: NhaDaiDoanKet, colId: string): string {
  switch (colId) {
    case 'nam':
      return String(item.nam ?? '');
    case 'ten_xa_phuong':
      return trimmedNddkDisplay(item.ten_xa_phuong) ?? '';
    case 'khoi_xom':
      return trimmedNddkDisplay(item.khoi_xom) ?? '';
    case 'doi_tuong':
      return trimmedNddkDisplay(item.doi_tuong) ?? '';
    case 'so_tien':
      return formatNddkSoTienDisplay(item.so_tien);
    case 'ngay_cap_nhat_trang_thai':
      return formatNddkNgayDisplay(item.ngay_cap_nhat_trang_thai);
    case 'ghi_chu':
      return trimmedNddkDisplay(item.ghi_chu) ?? '';
    case 'ho_va_ten_nguoi_tao':
      return formatNddkNguoiTaoDisplay(item);
    case 'tg_cap_nhat':
      return formatNddkDateTimeDisplay(item.tg_cap_nhat);
    default:
      return String((item as unknown as Record<string, unknown>)[colId] ?? '');
  }
}

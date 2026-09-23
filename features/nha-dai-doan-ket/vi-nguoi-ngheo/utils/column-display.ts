import type { ViNguoiNgheo } from '../core/types';
import {
  formatVnnDateTimeDisplay,
  formatVnnNgayDisplay,
  formatVnnNguoiTaoDisplay,
  formatVnnSoTienDisplay,
  trimmedVnnDisplay,
} from './display-format';

/** Chuỗi hiển thị của một cột — dùng chung cho bảng và cho file xuất. */
export function getVnnColumnDisplayValue(item: ViNguoiNgheo, colId: string): string {
  switch (colId) {
    case 'nam':
      return String(item.nam ?? '');
    case 'ten_xa_phuong':
    case 'khoi_xom':
    case 'doi_tuong':
    case 'ten_don_vi_ho_tro':
    case 'ghi_chu':
      return trimmedVnnDisplay(item[colId]) ?? '';
    case 'so_tien':
      return formatVnnSoTienDisplay(item.so_tien);
    case 'ngay_cap_nhat_trang_thai':
      return formatVnnNgayDisplay(item.ngay_cap_nhat_trang_thai);
    case 'ho_va_ten_nguoi_tao':
      return formatVnnNguoiTaoDisplay(item);
    case 'tg_cap_nhat':
      return formatVnnDateTimeDisplay(item.tg_cap_nhat);
    default:
      return String((item as unknown as Record<string, unknown>)[colId] ?? '');
  }
}

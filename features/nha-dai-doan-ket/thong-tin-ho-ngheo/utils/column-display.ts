import type { HoNgheo } from '../core/types';
import {
  formatHnghDateTimeDisplay,
  formatHnghDienThoaiDisplay,
  formatHnghNgayDisplay,
  formatHnghNguoiTaoDisplay,
  trimmedHnghDisplay,
} from './display-format';

/** Chuỗi hiển thị của một cột — dùng chung cho bảng và cho file xuất. */
export function getHnghColumnDisplayValue(item: HoNgheo, colId: string): string {
  switch (colId) {
    case 'so_cccd':
      return trimmedHnghDisplay(item.so_cccd) ?? '';
    case 'ten_xa_phuong':
      return trimmedHnghDisplay(item.ten_xa_phuong) ?? '';
    case 'khoi_xom':
      return trimmedHnghDisplay(item.khoi_xom) ?? '';
    case 'doi_tuong':
      return trimmedHnghDisplay(item.doi_tuong) ?? '';
    case 'dien_thoai':
      return formatHnghDienThoaiDisplay(item.dien_thoai);
    case 'ten_dan_toc':
      return trimmedHnghDisplay(item.ten_dan_toc) ?? '';
    case 'so_tai_khoan':
      return trimmedHnghDisplay(item.so_tai_khoan) ?? '';
    case 'ngan_hang':
      return trimmedHnghDisplay(item.ngan_hang) ?? '';
    case 'ngay_cap_nhat_trang_thai':
      return formatHnghNgayDisplay(item.ngay_cap_nhat_trang_thai);
    case 'ghi_chu':
      return trimmedHnghDisplay(item.ghi_chu) ?? '';
    case 'ho_va_ten_nguoi_tao':
      return formatHnghNguoiTaoDisplay(item);
    case 'tg_cap_nhat':
      return formatHnghDateTimeDisplay(item.tg_cap_nhat);
    default:
      return String((item as unknown as Record<string, unknown>)[colId] ?? '');
  }
}

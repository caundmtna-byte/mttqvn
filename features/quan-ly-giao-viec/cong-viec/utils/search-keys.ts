import type { CongViecDanhSachRow } from '../core/types';

export const CONG_VIEC_DANH_SACH_SEARCHABLE_KEYS: (keyof CongViecDanhSachRow)[] = [
  'ten_cong_viec',
  'ten_chuong_trinh',
  'muc_do',
  'ghi_chu',
  'trang_thai',
  'ho_va_ten_trach_nhiem',
  'ten_tai_khoan_trach_nhiem',
  'ho_va_ten_nguoi_tao',
  'ten_tai_khoan_nguoi_tao',
  'ho_tro_display',
  'ket_qua',
];

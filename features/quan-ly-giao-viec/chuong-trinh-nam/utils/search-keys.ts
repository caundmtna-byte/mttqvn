import type { ChuongTrinhNamListRow } from '../core/types';

/** Ô tìm kiếm tổng — mọi cột list; `tien_do_label` gắn ở filterFn (nhãn tiến độ tính toán). */
export const CHUONG_TRINH_NAM_SEARCHABLE_KEYS: (keyof ChuongTrinhNamListRow | 'tien_do_label')[] = [
  'ten_chuong_trinh',
  'ten_phong_ban',
  'ho_va_ten_nguoi_tao',
  'ten_tai_khoan_nguoi_tao',
  'ngay_bat_dau',
  'ngay_ket_thuc',
  'trang_thai',
  'tien_do_label',
  'tg_cap_nhat',
];

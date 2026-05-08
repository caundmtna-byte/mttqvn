import type { ChuongTrinhNamListRow } from '../core/types';

/** Cột dùng tìm kiếm nhanh (subset list, không gồm `mo_ta`). */
export const CHUONG_TRINH_NAM_SEARCHABLE_KEYS: (keyof ChuongTrinhNamListRow)[] = [
  'ten_chuong_trinh',
  'ten_phong_ban',
  'ho_va_ten_nguoi_tao',
];

import type { ChuongTrinhNamTrangThai } from './constants';

export interface ChuongTrinhNamFilters {
  columnSearch: Record<string, string>;
  trang_thai: string[];
  /** id `var_phong_ban` hoặc `__none__` khi chưa gán phòng ban */
  id_phong_ban: string[];
  /** Năm calendar từ `ngay_bat_dau` (YYYY) */
  nam_bat_dau: string[];
  /** `qua_han` | `sap_den_han` | `con_han` | `ket_thuc` — theo `ngay_ket_thuc` + trạng thái */
  tien_do: string[];
}

/** Danh sách — không gồm `mo_ta` (tách payload list / egress). */
export interface ChuongTrinhNamListRow {
  id: string;
  ten_chuong_trinh: string;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
  trang_thai: ChuongTrinhNamTrangThai;
  id_phong_ban: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ten_phong_ban?: string | null;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
}

/** Chi tiết / form — có mô tả và ghi chú (không đưa vào list row để giảm egress). */
export interface ChuongTrinhNam extends ChuongTrinhNamListRow {
  mo_ta: string | null;
  ghi_chu: string | null;
}

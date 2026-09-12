export interface MttqNhiemKyFilters {
  columnSearch: Record<string, string>;
  /** Lọc theo giá trị `tu_nam` (chuỗi năm, đồng bộ chip / header / mobile). */
  tu_nam_filter: string[];
  /** Lọc theo giá trị `den_nam`. */
  den_nam_filter: string[];
}

export interface MttqNhiemKy {
  id: string;
  ten_nhiem_ky: string;
  tu_nam: number | null;
  den_nam: number | null;
  thong_tin: string | null;
  sl_dau_nhiem_ky: number;
  sl_dang_tham_gia: number;
  sl_thoi_tham_gia: number;
  sl_can_bo_sung: number;
  sl_thieu: number;
  ghi_chu: string | null;
  /** Đã khoá sổ: chặn ghi vào uỷ viên, kỳ họp và điểm danh của nhiệm kỳ. */
  da_khoa: boolean;
  /** Vết khoá — máy chủ gán, chỉ có trong SELECT_FULL (detail). */
  tg_khoa?: string | null;
  nguoi_khoa_id?: string | null;
  ho_va_ten_nguoi_khoa?: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
}

export type MttqNhiemKyListRow = MttqNhiemKy;

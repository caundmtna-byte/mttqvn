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
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
}

export type MttqNhiemKyListRow = MttqNhiemKy;

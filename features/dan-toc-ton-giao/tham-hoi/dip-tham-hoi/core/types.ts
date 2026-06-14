import type { TrangThaiDipThamHoi } from './constants';

export interface DipThamHoiFilters {
  columnSearch: Record<string, string>;
  trang_thai_filter: string[];
  don_vi_to_chuc_filter: string[];
  phong_ban_filter: string[];
}

export interface DipThamHoi {
  id: string;
  ten_dip: string;
  mo_ta: string | null;
  thoi_gian_du_kien: string | null;
  thoi_gian_thuc_te: string | null;
  don_vi_to_chuc_id: string | null;
  ten_don_vi_to_chuc: string | null;
  phong_ban_tham_muu_id: string | null;
  ten_phong_ban: string | null;
  so_luong_to_chuc_du_kien: number;
  so_luong_ca_nhan_du_kien: number;
  so_luong_du_kien_tong: number;
  so_thuc_hien_to_chuc: number;
  so_thuc_hien_ca_nhan: number;
  so_hoan_thanh_to_chuc: number;
  so_hoan_thanh_ca_nhan: number;
  so_luong_thuc_te_tong: number;
  trang_thai: TrangThaiDipThamHoi;
  ghi_chu: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
}

/** Dùng cho Combobox chọn dịp trong module con + prefill form con */
export interface DipThamHoiOption {
  id: string;
  ten_dip: string;
  phong_ban_tham_muu_id?: string | null;
  thoi_gian_du_kien?: string | null;
  thoi_gian_thuc_te?: string | null;
}

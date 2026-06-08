import type { TrangThaiThamHoi } from './constants';

export interface ThamHoiCaNhanFilters {
  columnSearch: Record<string, string>;
  trang_thai_filter: string[];
  ca_nhan_filter: string[];
  phong_ban_filter: string[];
  don_vi_tham_hoi_filter: string[];
  xa_phuong_filter: string[];
}

export interface ThamHoiCaNhan {
  id: string;
  ca_nhan_id: string;
  ho_va_ten: string | null;
  doi_tuong: string | null;
  chuc_vu_vi_tri: string | null;
  phong_ban_tham_muu_id: string | null;
  ten_phong_ban: string | null;
  dip_tham_hoi: string;
  /** ISO date YYYY-MM-DD (ngày đầu tháng) */
  thoi_gian_du_kien: string | null;
  don_vi_tham_hoi_id: string | null;
  ten_don_vi_tham_hoi: string | null;
  qua_tang: string | null;
  xa_phuong_id: string | null;
  ten_xa_phuong: string | null;
  trang_thai: TrangThaiThamHoi;
  ket_qua_ghi_chu: string | null;
  link_ket_qua: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
}

import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';

export interface ThongTinCaNhanTieuBieuFilters {
  columnSearch: Record<string, string>;
  doi_tuong_filter: string[];
  trang_thai_filter: string[];
  don_vi_filter: string[];
}

export interface ThongTinCaNhanTieuBieu {
  id: string;
  ho_va_ten: string;
  ngay_sinh: string | null;
  doi_tuong: string;
  chuc_vu_vi_tri: string | null;
  ton_giao_dan_toc: string | null;
  dia_chi: string | null;
  don_vi_id: string | null;
  ten_don_vi: string | null;
  ten_tinh: string | null;
  so_dien_thoai: string | null;
  dong_gop_noi_bat: string | null;
  trang_thai: TrangThaiHoatDong;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
}

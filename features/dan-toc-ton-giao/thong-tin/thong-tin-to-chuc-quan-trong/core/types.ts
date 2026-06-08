import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';

export interface ThongTinToChucQuanTrongFilters {
  columnSearch: Record<string, string>;
  loai_hinh_filter: string[];
  trang_thai_filter: string[];
  don_vi_filter: string[];
}

export interface ThongTinToChucQuanTrong {
  id: string;
  loai_hinh: string;
  ten_co_so: string;
  chu_tri: string | null;
  lich_su_hinh_thanh: string | null;
  cong_tac_an_sinh: string | null;
  don_vi_id: string | null;
  ten_don_vi: string | null;
  ten_tinh: string | null;
  dia_chi: string | null;
  so_dien_thoai: string | null;
  trang_thai: TrangThaiHoatDong;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
}

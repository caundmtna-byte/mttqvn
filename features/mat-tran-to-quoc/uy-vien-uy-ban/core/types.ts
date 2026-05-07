export interface MttqUyVienUyBanFilters {
  columnSearch: Record<string, string>;
  nhiem_ky_filter: string[];
  don_vi_filter: string[];
}

export interface MttqUyVienUyBan {
  id: string;
  ma_uv: string | null;
  nhiem_ky_id: string;
  ten_nhiem_ky: string;
  don_vi_id: string | null;
  ten_don_vi: string | null;
  ho_va_ten: string;
  chuc_vu_don_vi: string | null;
  ngay_sinh: string | null;
  gioi_tinh: string | null;
  trang_thai_tham_gia: string | null;
  ngay_nhap_trang_thai: string | null;
  van_hoa: string | null;
  trinh_do_cm: string | null;
  trinh_do_llct: string | null;
  dan_toc: string | null;
  ton_giao: string | null;
  dang_vien: boolean;
  ngay_vao_dang: string | null;
  que_quan: string | null;
  noi_o_hien_nay: string | null;
  so_dien_thoai: string | null;
  ghi_chu: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
}

export type MttqUyVienUyBanListRow = MttqUyVienUyBan;

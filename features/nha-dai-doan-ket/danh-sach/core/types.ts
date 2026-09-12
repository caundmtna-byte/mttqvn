import type {
  NddkDoiTuong,
  NddkLoaiHinh,
  NddkNguon,
  NddkNguonHoTro,
  NddkTrangThai,
} from './constants';

export interface NhaDaiDoanKetFilters {
  columnSearch: Record<string, string>;
  nam_filter: string[];
  nguon_filter: string[];
  nguon_ho_tro_filter: string[];
  doi_tuong_filter: string[];
  loai_hinh_filter: string[];
  trang_thai_filter: string[];
  xa_phuong_filter: string[];
}

export interface NhaDaiDoanKet {
  id: string;
  noi_dung_ho_tro: string;
  nam: number;
  nguon: NddkNguon;
  nguon_ho_tro: NddkNguonHoTro;
  ho_ten_chu_ho: string;
  xa_phuong_id: string | null;
  ten_xa_phuong: string | null;
  khoi_xom: string | null;
  doi_tuong: NddkDoiTuong | null;
  loai_hinh_ho_tro: NddkLoaiHinh;
  /** VND, không phần lẻ. `null` khi hồ sơ còn ở bước khảo sát, chưa chốt mức hỗ trợ. */
  so_tien: number | null;
  trang_thai: NddkTrangThai;
  /** Máy chủ gán khi `trang_thai` đổi — không có ô nhập trên form. */
  ngay_cap_nhat_trang_thai: string;
  ghi_chu: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
}

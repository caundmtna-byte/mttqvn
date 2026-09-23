import type {
  VnnDoiTuong,
  VnnHinhThuc,
  VnnLinhVuc,
  VnnNguon,
  VnnNguonHoTro,
  VnnTrangThai,
} from './constants';

export interface ViNguoiNgheoFilters {
  columnSearch: Record<string, string>;
  nam_filter: string[];
  linh_vuc_filter: string[];
  nguon_filter: string[];
  nguon_ho_tro_filter: string[];
  doi_tuong_filter: string[];
  hinh_thuc_filter: string[];
  trang_thai_filter: string[];
  xa_phuong_filter: string[];
}

/** Một khoản hỗ trợ. Mọi id là `string` — quy ước chung toàn repo. */
export interface ViNguoiNgheo {
  id: string;
  noi_dung_ho_tro: string;
  nam: number;
  linh_vuc_ho_tro: VnnLinhVuc;
  nguon: VnnNguon;
  nguon_ho_tro: VnnNguonHoTro;
  /** Hộ nghèo được liên kết (tuỳ chọn). Họ tên/xã… vẫn lưu riêng ở các cột dưới. */
  ho_ngheo_id: string | null;
  ho_ten_nguoi_nhan: string;
  xa_phuong_id: string | null;
  ten_xa_phuong: string | null;
  khoi_xom: string | null;
  doi_tuong: VnnDoiTuong | null;
  hinh_thuc_ho_tro: VnnHinhThuc;
  /** VND, không phần lẻ. `null` khi chỉ có quà hoặc chưa chốt mức. */
  so_tien: number | null;
  trang_thai: VnnTrangThai;
  /** Máy chủ gán khi `trang_thai` đổi — không có ô nhập trên form. */
  ngay_cap_nhat_trang_thai: string;
  don_vi_ho_tro_id: string | null;
  ten_don_vi_ho_tro: string | null;
  ghi_chu: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
}

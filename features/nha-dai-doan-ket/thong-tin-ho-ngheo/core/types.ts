import type {
  HnghDoiTuong,
  HnghGioiTinh,
  HnghTinhTrangDat,
  HnghToChuc,
  HnghTonGiao,
  HnghTrangThai,
  HnghViecLam,
} from './constants';

export interface HoNgheoFilters {
  columnSearch: Record<string, string>;
  doi_tuong_filter: string[];
  ton_giao_filter: string[];
  to_chuc_filter: string[];
  trang_thai_filter: string[];
  dan_toc_filter: string[];
  xa_phuong_filter: string[];
}

/** Một hộ. Mọi id là `string` — quy ước chung toàn repo. */
export interface HoNgheo {
  id: string;
  ho_ten_dai_dien: string;
  /** Để trống được; đã nhập thì không trùng hộ khác (partial unique dưới DB). */
  so_cccd: string | null;
  xa_phuong_id: string | null;
  ten_xa_phuong: string | null;
  khoi_xom: string | null;
  doi_tuong: HnghDoiTuong | null;
  dien_thoai: string | null;
  dan_toc_id: string | null;
  ten_dan_toc: string | null;
  ton_giao: HnghTonGiao;
  to_chuc: HnghToChuc;
  so_tai_khoan: string | null;
  ngan_hang: string | null;
  trang_thai: HnghTrangThai;
  /** Máy chủ gán khi `trang_thai` đổi — không có ô nhập trên form. */
  ngay_cap_nhat_trang_thai: string;
  ghi_chu: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
  /** Trigger `fn_gan_nguoi_cap_nhat` gán — form không gửi. */
  id_nguoi_cap_nhat?: string | null;
  ho_va_ten_nguoi_cap_nhat?: string | null;
  ten_tai_khoan_nguoi_cap_nhat?: string | null;
  /**
   * Nhân khẩu & đời sống — CHỈ có khi dòng được đọc bằng `HNGH_SELECT_FULL`
   * (chi tiết / sửa / in). Dòng từ RPC phân trang không có ⇒ `undefined`,
   * nghĩa là "chưa tải", KHÔNG phải "trống".
   */
  nhan_khau?: HnghNhanKhau;
}

/** Thông tin cá nhân chủ hộ in ở phiếu khảo sát / biên bản bàn giao nhà. */
export interface HnghNhanKhau {
  gioi_tinh: HnghGioiTinh | null;
  nam_sinh: number | null;
  /** `YYYY-MM-DD` */
  ngay_cap_cccd: string | null;
  noi_cap_cccd: string | null;
  ho_ten_vo_chong: string | null;
  so_nhan_khau: number | null;
  nghe_nghiep: string | null;
  trinh_do_hoc_van: string | null;
  tinh_trang_viec_lam: HnghViecLam | null;
  doi_tuong_uu_tien: string | null;
  tinh_trang_dat: HnghTinhTrangDat | null;
}

/** Một NHÓM hộ cùng phân loại (RPC `get_hngh_thong_ke_nhom`), `so_ho` = số hộ của nhóm. */
export interface HoNgheoThongKeRow {
  so_ho: number;
  xa_phuong_id: string | null;
  ten_xa_phuong: string | null;
  doi_tuong: HnghDoiTuong | null;
  dan_toc_id: string | null;
  ten_dan_toc: string | null;
  ton_giao: HnghTonGiao;
  trang_thai: HnghTrangThai;
}

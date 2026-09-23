import type {
  HnghDoiTuong,
  HnghTonGiao,
  HnghTrangThai,
} from './constants';

export interface HoNgheoFilters {
  columnSearch: Record<string, string>;
  doi_tuong_filter: string[];
  ton_giao_filter: string[];
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
}

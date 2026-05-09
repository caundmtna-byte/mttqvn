export type BaiVietListScope = 'all' | 'mine';

export interface BaiVietDanhSachFilters {
  columnSearch: Record<string, string>;
  id_the_loai: string[];
  id_nguon_dang: string[];
  id_trang_dang: string[];
}

/** Danh sách / chi tiết — id và FK dạng string (JSON bigint từ Supabase). */
export interface BaiVietDanhSach {
  id: string;
  ten_bai: string;
  id_the_loai: string;
  ten_the_loai?: string | null;
  don_gia: number;
  /** ISO date YYYY-MM-DD */
  ngay_dang: string;
  id_nguon_dang: string;
  ten_nguon_dang?: string | null;
  id_trang_dang: string;
  ten_trang_dang?: string | null;
  link: string;
  id_nguoi_tao: string;
  /** Phòng ban nhân viên tạo bài (embed `nguoi_tao`) — dùng lọc phạm vi tab Nhuận bút "Tất cả". */
  id_phong_ban_nguoi_tao?: string | null;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
  tg_tao: string;
  tg_cap_nhat: string;
}

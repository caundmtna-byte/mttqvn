export type BaiVietListScope = 'all' | 'mine';

export interface BaiVietDanhSachFilters {
  columnSearch: Record<string, string>;
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
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
  tg_tao: string;
  tg_cap_nhat: string;
}

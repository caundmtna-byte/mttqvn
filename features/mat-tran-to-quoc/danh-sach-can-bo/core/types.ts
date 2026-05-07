export interface MttqCanBoFilters {
  columnSearch: Record<string, string>;
  /** Giá trị `trang_thai_id` hoặc `__null__` khi chưa gán. */
  trang_thai_id: string[];
  gioi_tinh: string[];
}

/** Danh sách / chi tiết — id và FK dạng string (bigint JSON từ Supabase). */
export interface MttqCanBo {
  id: string;
  cap_quan_ly_id: string | null;
  to_chuc_id: string | null;
  ho_ten: string;
  /** ISO date YYYY-MM-DD */
  ngay_sinh: string | null;
  gioi_tinh: string;
  dan_toc_id: string | null;
  ton_giao: string | null;
  dia_chi: string | null;
  dang_vien: boolean;
  trinh_do_id: string | null;
  ly_luan_chinh_tri_id: string | null;
  dien_thoai: string | null;
  chuc_vu_id: string | null;
  ngay_tham_gia_to_chuc: string | null;
  trang_thai_id: string | null;
  ngay_nhap_trang_thai: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ten_cap_quan_ly: string | null;
  ten_to_chuc: string | null;
  ten_dan_toc: string | null;
  ten_trinh_do: string | null;
  ten_ly_luan_chinh_tri: string | null;
  ten_chuc_vu: string | null;
  ten_trang_thai: string | null;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
}

/** Bản ghi kèm tuổi tính từ ngày sinh (chỉ client). */
export interface MttqCanBoRow extends MttqCanBo {
  tuoi: number | null;
}

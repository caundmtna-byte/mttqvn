export interface MttqCanBoFilters {
  columnSearch: Record<string, string>;
  /** Giá trị `trang_thai_id` hoặc `__null__` khi chưa gán. */
  trang_thai_id: string[];
  gioi_tinh: string[];
  /** `to_chuc_id` hoặc chip null. */
  to_chuc_id: string[];
  phong_ban_id: string[];
  chuc_vu_id: string[];
  /** `Tỉnh` | `Xã phường` | `__null__` — theo `chuc_vu_cap_quan_ly` sau chuẩn hoá. */
  chuc_vu_cap_quan_ly: string[];
  don_vi_id: string[];
  dan_toc_id: string[];
  /** `CHIP_DANG_VIEN_YES` / `CHIP_DANG_VIEN_NO`. */
  dang_vien: string[];
  trinh_do_id: string[];
  ly_luan_chinh_tri_id: string[];
}

/** Danh sách / chi tiết — id và FK dạng string (bigint JSON từ Supabase). */
export interface MttqCanBo {
  id: string;
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
  /** FK `var_phong_ban.id` — bộ phận nếu có, ngược lại phòng ban cha. */
  phong_ban_id: string | null;
  /** FK `var_ssn_xa_phuong.id` — dùng khi chức vụ có `cap_quan_ly` = Xã phường. */
  don_vi_id: string | null;
  ngay_tham_gia_to_chuc: string | null;
  trang_thai_id: string | null;
  ngay_nhap_trang_thai: string | null;
  van_hoa: string | null;
  ngay_vao_dang: string | null;
  que_quan: string | null;
  noi_o_hien_nay: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ten_to_chuc: string | null;
  ten_dan_toc: string | null;
  ten_trinh_do: string | null;
  ten_ly_luan_chinh_tri: string | null;
  ten_chuc_vu: string | null;
  /** Tên phòng ban cha (hiển thị). */
  ten_phong_ban?: string | null;
  /** Tên bộ phận con khi `phong_ban_id` trỏ tới con (hiển thị). */
  ten_bo_phan?: string | null;
  /** `var_chuc_vu.cap_quan_ly` từ embed — phục vụ rule đơn vị / validate. */
  chuc_vu_cap_quan_ly?: string | null;
  /** Hiển thị: tên xã — tỉnh (embed). */
  ten_don_vi: string | null;
  ten_trang_thai: string | null;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
}

/** Bản ghi kèm tuổi tính từ ngày sinh (chỉ client). */
export interface MttqCanBoRow extends MttqCanBo {
  tuoi: number | null;
}

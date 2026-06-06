/** Trạng thái nhân viên (tiếng Việt có dấu — khớp CHECK trên Supabase). */
export type TrangThaiNhanVien = 'Hoạt động' | 'Khóa';

/** Bản ghi `var_nhan_vien` (id / FK int8; PostgREST trả về dạng số hoặc chuỗi số). */
export interface Employee {
  id: string;
  ten_tai_khoan: string;
  ho_va_ten: string;
  hinh_anh: string | null;
  id_phong_ban: string | null;
  id_bo_phan: string | null;
  id_chuc_vu: string | null;
  /** FK `var_ssn_xa_phuong.id` — bắt buộc khi `cap_quan_ly` có 'Xã phường'. */
  don_vi_id?: string | null;
  /** Cấp quản lý trực tiếp trên nhân viên (lưu trong var_nhan_vien, đa chọn). */
  cap_quan_ly: string[];
  /** Danh sách tổ chức (đa chọn, mảng bigint dưới dạng string). */
  to_chuc_ids: string[];
  /** Tên tổ chức đã resolve client-side từ mttq_thiet_lap. */
  ten_to_chuc_arr?: string[];
  trang_thai: TrangThaiNhanVien;
  tg_tao?: string;
  tg_cap_nhat?: string;
  ten_phong_ban?: string;
  ten_bo_phan?: string;
  ten_chuc_vu?: string;
  /** Hiển thị: tên xã/phường · tỉnh (enrich từ danh mục địa bàn). */
  ten_don_vi?: string;
}

export interface EmployeeFilters {
  columnSearch: Record<string, string>;
  trang_thai: string[];
  id_phong_ban: string[];
  id_chuc_vu: string[];
}

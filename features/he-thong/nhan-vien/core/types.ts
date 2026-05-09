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
  /** FK `var_ssn_xa_phuong.id` — bắt buộc khi chức vụ có `cap_quan_ly` = "Xã phường". */
  don_vi_id?: string | null;
  trang_thai: TrangThaiNhanVien;
  tg_tao?: string;
  tg_cap_nhat?: string;
  ten_phong_ban?: string;
  ten_bo_phan?: string;
  ten_chuc_vu?: string;
  /** `cap_quan_ly` của chức vụ đang gán (enrich từ `var_chuc_vu`). */
  cap_quan_ly?: string | null;
  /** Hiển thị: tên xã/phường · tỉnh (enrich từ danh mục địa bàn). */
  ten_don_vi?: string;
}

export interface EmployeeFilters {
  columnSearch: Record<string, string>;
  trang_thai: string[];
  id_phong_ban: string[];
  id_chuc_vu: string[];
}

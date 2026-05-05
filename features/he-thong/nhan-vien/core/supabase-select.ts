/**
 * PostgREST `.select()` cho bảng `var_nhan_vien` — không dùng `*`.
 * Không có `auth_user_id`: đối chiếu user qua `ten_tai_khoan` + email Auth.
 */
export const VAR_NHAN_VIEN_ROW_COLUMNS = [
  'id',
  'ten_tai_khoan',
  'ho_va_ten',
  'hinh_anh',
  'id_phong_ban',
  'id_bo_phan',
  'id_chuc_vu',
  'trang_thai',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const EMPLOYEE_SELECT_FULL = VAR_NHAN_VIEN_ROW_COLUMNS;
export const EMPLOYEE_RETURNING_FULL = VAR_NHAN_VIEN_ROW_COLUMNS;
export const EMPLOYEE_RETURNING_STATUS_ONLY = 'id,trang_thai,tg_cap_nhat';

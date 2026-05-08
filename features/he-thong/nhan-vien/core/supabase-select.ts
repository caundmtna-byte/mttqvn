/**
 * PostgREST `.select()` cho bảng `var_nhan_vien` — không dùng `*`.
 * Không có `auth_user_id`: đối chiếu user qua `ten_tai_khoan` + email Auth.
 *
 * `hinh_anh` chỉ ship khi mở detail/form sửa (`SELECT_FULL`). Trong list (`SELECT_LIST`),
 * chúng ta dùng avatar fallback (`getAvatarUrl(ho_va_ten)`) để cắt egress đáng kể —
 * `hinh_anh` hiện cho phép base64 ≤ 2MB nên việc loại khỏi list là rất quan trọng.
 * `hinh_anh` lưu path bucket private (`nhan-vien/...`); UI dùng signed URL khi hiển thị.
 */
const LIST_COLS = [
  'id',
  'ten_tai_khoan',
  'ho_va_ten',
  'id_phong_ban',
  'id_bo_phan',
  'id_chuc_vu',
  'trang_thai',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

const FULL_COLS = [
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

/** @deprecated dùng `EMPLOYEE_SELECT_LIST` hoặc `EMPLOYEE_SELECT_FULL` thay thế. */
export const VAR_NHAN_VIEN_ROW_COLUMNS = FULL_COLS;

export const EMPLOYEE_SELECT_LIST = LIST_COLS;
export const EMPLOYEE_SELECT_FULL = FULL_COLS;
export const EMPLOYEE_RETURNING_FULL = FULL_COLS;
export const EMPLOYEE_RETURNING_STATUS_ONLY = 'id,trang_thai,tg_cap_nhat';

const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!mttq_nhiem_ky_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)';

const NGUOI_KHOA =
  'nguoi_khoa:var_nhan_vien!mttq_nhiem_ky_nguoi_khoa_id_fkey(ho_va_ten,ten_tai_khoan)';

/**
 * Cột render ở grid + filter — bỏ long-text (`thong_tin`, `ghi_chu`) khỏi LIST.
 * `da_khoa` nằm ở LIST vì bảng phải ẩn nút Sửa/Xoá ngay trên dòng; còn vết khoá
 * (`tg_khoa`, người khoá) chỉ cần ở detail nên để ở FULL.
 */
const LIST_COLS = [
  'id',
  'ten_nhiem_ky',
  'da_khoa',
  'tu_nam',
  'den_nam',
  'sl_dau_nhiem_ky',
  'sl_dang_tham_gia',
  'sl_thoi_tham_gia',
  'sl_can_bo_sung',
  'sl_thieu',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

const FULL_COLS = [LIST_COLS, 'thong_tin', 'ghi_chu', 'tg_khoa', 'nguoi_khoa_id'].join(',');

export const MTTQ_NHIEM_KY_SELECT_LIST = `${LIST_COLS},${NGUOI_TAO}`;

export const MTTQ_NHIEM_KY_SELECT_FULL = `${FULL_COLS},${NGUOI_TAO},${NGUOI_KHOA}`;

export const MTTQ_NHIEM_KY_RETURNING = 'id,tg_cap_nhat';

/** @deprecated use MTTQ_NHIEM_KY_RETURNING + getById */
export const MTTQ_NHIEM_KY_RETURNING_FULL = MTTQ_NHIEM_KY_SELECT_FULL;

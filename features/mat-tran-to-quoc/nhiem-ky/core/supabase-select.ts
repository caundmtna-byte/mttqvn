const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!mttq_nhiem_ky_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)';

const BASE_COLS = [
  'id',
  'ten_nhiem_ky',
  'tu_nam',
  'den_nam',
  'thong_tin',
  'sl_dau_nhiem_ky',
  'sl_dang_tham_gia',
  'sl_thoi_tham_gia',
  'sl_can_bo_sung',
  'sl_thieu',
  'ghi_chu',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const MTTQ_NHIEM_KY_SELECT_LIST = `${BASE_COLS},${NGUOI_TAO}`;

export const MTTQ_NHIEM_KY_SELECT_FULL = MTTQ_NHIEM_KY_SELECT_LIST;

export const MTTQ_NHIEM_KY_RETURNING_FULL = MTTQ_NHIEM_KY_SELECT_FULL;

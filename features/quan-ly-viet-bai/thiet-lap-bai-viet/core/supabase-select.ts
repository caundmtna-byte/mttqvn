/** PostgREST: không dùng `*`. */
export const BAI_VIET_THE_LOAI_COLUMNS = [
  'id',
  'ten_the_loai',
  'mo_ta',
  'don_gia',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const THE_LOAI_SELECT_FULL = BAI_VIET_THE_LOAI_COLUMNS;
export const THE_LOAI_RETURNING_FULL = THE_LOAI_SELECT_FULL;

export const BAI_VIET_THIET_LAP_KHAC_COLUMNS = [
  'id',
  'loai',
  'ten',
  'mo_ta',
  'thu_tu',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const THIET_LAP_KHAC_SELECT_FULL = BAI_VIET_THIET_LAP_KHAC_COLUMNS;
export const THIET_LAP_KHAC_RETURNING_FULL = THIET_LAP_KHAC_SELECT_FULL;

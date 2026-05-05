export const HE_THONG_PHONG_BAN_ROW_COLUMNS = [
  'id',
  'ma_phong_ban',
  'ten_phong_ban',
  'mo_ta',
  'cha_id',
  'cap_do',
  'duong_dan',
  'trang_thai',
  'thu_tu',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const DEPARTMENT_SELECT_FULL = HE_THONG_PHONG_BAN_ROW_COLUMNS;

export const DEPARTMENT_RETURNING_FULL = DEPARTMENT_SELECT_FULL;

export const DEPARTMENT_RETURNING_STATUS_ONLY = 'id,trang_thai,tg_cap_nhat';

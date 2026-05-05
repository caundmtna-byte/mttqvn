/** Bảng phân quyền — liệt kê cột thay vì `*`. */
export const HE_THONG_PHAN_QUYEN_ROW_COLUMNS = [
  'id',
  'id_chuc_vu',
  'ma_chuc_vu',
  'ten_chuc_vu',
  'ten_phong_ban',
  'thu_tu_phong_ban',
  'thu_tu_chuc_vu',
  'mo_ta',
  'so_nhan_vien',
  'quyen_han',
  'trang_thai',
  'tg_cap_nhat',
].join(',');

export const ROLE_SELECT_FULL = HE_THONG_PHAN_QUYEN_ROW_COLUMNS;

export const ROLE_RETURNING_FULL = ROLE_SELECT_FULL;

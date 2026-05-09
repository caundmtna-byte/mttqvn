/** PostgREST: không dùng `*` — giảm egress. */
export const VAR_CHUC_VU_ROW_COLUMNS = [
  'id',
  'ten_chuc_vu',
  'mo_ta',
  'phong_ban_id',
  'cap_bac',
  'cap_quan_ly',
  'thu_tu',
  'trang_thai',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

/** Embed theo FK Postgres var_chuc_vu → var_phong_ban */
export const POSITION_SELECT_FULL = `${VAR_CHUC_VU_ROW_COLUMNS},var_phong_ban(ten_phong_ban)`;

export const POSITION_RETURNING_FULL = POSITION_SELECT_FULL;

/** Đổi trạng thái — đủ cột hiển thị + embed phòng ban */
export const POSITION_RETURNING_STATUS_ONLY =
  'id,ten_chuc_vu,trang_thai,tg_cap_nhat,var_phong_ban(ten_phong_ban)';

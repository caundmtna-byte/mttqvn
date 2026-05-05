/** PostgREST: không dùng `*` — giảm egress. */
export const HE_THONG_CHUC_VU_ROW_COLUMNS = [
  'id',
  'ma_chuc_vu',
  'ten_chuc_vu',
  'cap_bac_id',
  'phong_ban_id',
  'mo_ta',
  'thu_tu',
  'trang_thai',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const POSITION_SELECT_FULL = `${HE_THONG_CHUC_VU_ROW_COLUMNS},he_thong_cap_bac(ten_cap_bac),he_thong_phong_ban(ten_phong_ban)`;

export const POSITION_RETURNING_FULL = POSITION_SELECT_FULL;

/** Chỉ đổi trạng thái — merge ở hook; payload trả về nhỏ. */
export const POSITION_RETURNING_STATUS_ONLY =
  'id,trang_thai,tg_cap_nhat,he_thong_cap_bac(ten_cap_bac),he_thong_phong_ban(ten_phong_ban)';

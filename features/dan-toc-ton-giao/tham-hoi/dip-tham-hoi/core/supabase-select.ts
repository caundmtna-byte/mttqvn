const DON_VI =
  'don_vi_to_chuc:var_ssn_xa_phuong!dttg_dip_tham_hoi_don_vi_to_chuc_id_fkey(ten)';

const PHONG_BAN =
  'phong_ban:var_phong_ban!dttg_dip_tham_hoi_phong_ban_tham_muu_id_fkey(ten_phong_ban)';

const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!dttg_dip_tham_hoi_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)';

const VIEW_COLS = [
  'id',
  'ten_dip',
  'mo_ta',
  'thoi_gian_du_kien',
  'thoi_gian_thuc_te',
  'don_vi_to_chuc_id',
  'phong_ban_tham_muu_id',
  'so_luong_to_chuc_du_kien',
  'so_luong_ca_nhan_du_kien',
  'trang_thai',
  'ghi_chu',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
  'so_thuc_hien_to_chuc',
  'so_thuc_hien_ca_nhan',
  'so_hoan_thanh_to_chuc',
  'so_hoan_thanh_ca_nhan',
  'so_luong_du_kien_tong',
  'so_luong_thuc_te_tong',
].join(',');

const TABLE_COLS = [
  'id',
  'ten_dip',
  'mo_ta',
  'thoi_gian_du_kien',
  'thoi_gian_thuc_te',
  'don_vi_to_chuc_id',
  'phong_ban_tham_muu_id',
  'so_luong_to_chuc_du_kien',
  'so_luong_ca_nhan_du_kien',
  'trang_thai',
  'ghi_chu',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const DTTG_DIP_THAM_HOI_VIEW = 'dttg_dip_tham_hoi_with_counts';

export const DTTG_DIP_THAM_HOI_TABLE = 'dttg_dip_tham_hoi';

/** View — chỉ cột (PostgREST không embed FK ổn định trên view) */
export const DTTG_DIP_THAM_HOI_SELECT_VIEW_PLAIN = VIEW_COLS;

/** View + embed đầy đủ (counts + phòng ban) */
export const DTTG_DIP_THAM_HOI_SELECT_FULL = `${VIEW_COLS},${DON_VI},${PHONG_BAN},${NGUOI_TAO}`;

/** View không embed phòng ban (khi cột/FK chưa migrate) */
export const DTTG_DIP_THAM_HOI_SELECT_VIEW_NO_PB = `${VIEW_COLS},${DON_VI},${NGUOI_TAO}`;

/** Bảng gốc — chỉ cột */
export const DTTG_DIP_THAM_HOI_SELECT_TABLE_PLAIN = TABLE_COLS;

/** Bảng gốc + embed tối thiểu (fallback khi view chưa có) */
export const DTTG_DIP_THAM_HOI_SELECT_TABLE = `${TABLE_COLS},${DON_VI},${NGUOI_TAO}`;

/** @deprecated alias — dùng DTTG_DIP_THAM_HOI_SELECT_FULL */
export const DTTG_DIP_THAM_HOI_SELECT = DTTG_DIP_THAM_HOI_SELECT_FULL;

export const DTTG_DIP_THAM_HOI_RETURNING = DTTG_DIP_THAM_HOI_SELECT_FULL;

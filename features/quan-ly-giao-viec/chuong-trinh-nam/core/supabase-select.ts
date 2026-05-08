const EMBED = [
  'phong_ban:var_phong_ban!chuong_trinh_nam_id_phong_ban_fkey(ten_phong_ban)',
  'nguoi_tao:var_nhan_vien!chuong_trinh_nam_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)',
].join(',');

const LIST_COLS = [
  'id',
  'ten_chuong_trinh',
  'ngay_bat_dau',
  'ngay_ket_thuc',
  'trang_thai',
  'id_phong_ban',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

/** Danh sách: không kéo `mo_ta`. */
export const CHUONG_TRINH_NAM_SELECT_LIST = `${LIST_COLS},${EMBED}`;

export const CHUONG_TRINH_NAM_SELECT_FULL = `${LIST_COLS},mo_ta,ghi_chu,${EMBED}`;
export const CHUONG_TRINH_NAM_RETURNING_FULL = CHUONG_TRINH_NAM_SELECT_FULL;

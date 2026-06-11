const TO_CHUC =
  'to_chuc:dttg_thong_tin_to_chuc_quan_trong!dttg_tham_hoi_to_chuc_to_chuc_id_fkey(ten_co_so,loai_hinh)';

const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!dttg_tham_hoi_to_chuc_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)';

const DON_VI_THAM_HOI =
  'don_vi_tham_hoi:var_ssn_xa_phuong!dttg_tham_hoi_to_chuc_don_vi_tham_hoi_id_fkey(ten)';

const DIP =
  'dip:dttg_dip_tham_hoi!dttg_tham_hoi_to_chuc_dip_tham_hoi_id_fkey(ten_dip)';

const PHONG_BAN =
  'phong_ban:var_phong_ban!dttg_tham_hoi_to_chuc_phong_ban_tham_muu_id_fkey(ten_phong_ban)';

const LIST_COLS = [
  'id',
  'to_chuc_id',
  'dip_tham_hoi_id',
  'dip_tham_hoi',
  'thoi_gian_du_kien',
  'thoi_gian_thuc_te',
  'don_vi_tham_hoi_id',
  'phong_ban_tham_muu_id',
  'noi_dung_tham_hoi',
  'thanh_phan_doan',
  'qua_tang',
  'tien_do',
  'ket_qua_thuc_hien',
  'link_ket_qua',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const DTTG_THAM_HOI_TO_CHUC_SELECT = `${LIST_COLS},${TO_CHUC},${DON_VI_THAM_HOI},${DIP},${PHONG_BAN},${NGUOI_TAO}`;

export const DTTG_THAM_HOI_TO_CHUC_RETURNING = DTTG_THAM_HOI_TO_CHUC_SELECT;

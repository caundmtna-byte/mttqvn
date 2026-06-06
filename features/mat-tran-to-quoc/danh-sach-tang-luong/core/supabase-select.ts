const BASE_COLS = [
  'id',
  'can_bo_id',
  'ngay_nang_luong',
  'loai_ky',
  'ngach_luong_id_cu',
  'bac_luong_id_cu',
  'ngach_luong_id_moi',
  'bac_luong_id_moi',
  'so_thang_rut_ngan',
  'ngay_den_han_goc',
  'luong',
  'ghi_chu',
  'file_quyet_dinh',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

const CAN_BO_EMBED =
  'can_bo:can_bo_id(ho_ten,phong_ban_id,don_vi_id,to_chuc_ids,cap_quan_ly,phong_ban:phong_ban_id(ten_phong_ban,cha_id),don_vi:don_vi_id(ten,var_ssn_tinh_thanh(ten)))';

const NGACH_CU = 'ngach_cu:ngach_luong_id_cu(ten,ma)';
const BAC_CU = 'bac_cu:bac_luong_id_cu(ma_bac)';
const NGACH_MOI = 'ngach_moi:ngach_luong_id_moi(ten,ma)';
const BAC_MOI = 'bac_moi:bac_luong_id_moi(ma_bac,ngach_id)';
const NGUOI_TAO = 'nguoi_tao:id_nguoi_tao(ho_va_ten,ten_tai_khoan)';

const EMBED_LIST = [CAN_BO_EMBED, NGACH_CU, BAC_CU, NGACH_MOI, BAC_MOI, NGUOI_TAO].join(',');

export const MTTQ_TANG_LUONG_SELECT_LIST = `${BASE_COLS},${EMBED_LIST}`;
export const MTTQ_TANG_LUONG_SELECT_FULL = MTTQ_TANG_LUONG_SELECT_LIST;
export const MTTQ_TANG_LUONG_RETURNING = BASE_COLS;

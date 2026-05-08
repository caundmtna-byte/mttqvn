const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!mttq_lop_tap_huan_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan,id_phong_ban)';

const BASE_COLS = [
  'id',
  'ten_lop_tap_huan',
  'nam_tap_huan',
  'cap_tap_huan',
  'ghi_chu',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

/**
 * Danh sách: dùng aggregate `count` thay vì kéo mảng id dòng con.
 * Trước: `mttq_lop_tap_huan_ct(id)` → ship mảng id (mỗi quyết định N×8 byte) chỉ để `arr.length`.
 * Sau: `mttq_lop_tap_huan_ct(count)` → trả 1 số nguyên — egress giảm O(N).
 */
export const MTTQ_LOP_TAP_HUAN_SELECT_LIST = `${BASE_COLS},${NGUOI_TAO},mttq_lop_tap_huan_ct(count)`;

const CAN_BO_EMBED = [
  'ho_ten',
  'cap_quan_ly:mttq_thiet_lap!mttq_can_bo_cap_quan_ly_id_fkey(ten,loai)',
  'to_chuc:mttq_thiet_lap!mttq_can_bo_to_chuc_id_fkey(ten,loai)',
  'chuc_vu:mttq_thiet_lap!mttq_can_bo_chuc_vu_id_fkey(ten,loai)',
].join(',');

const CT_FULL = `mttq_lop_tap_huan_ct(id,id_lop_tap_huan,can_bo_id,chuc_vu,don_vi_cong_tac,thuoc_dien,can_bo:mttq_can_bo!mttq_lop_tap_huan_ct_can_bo_id_fkey(${CAN_BO_EMBED}))`;

/** Chi tiết / sau ghi: đủ dòng con + thông tin cán bộ join. */
export const MTTQ_LOP_TAP_HUAN_SELECT_FULL = `${BASE_COLS},${NGUOI_TAO},${CT_FULL}`;

export const MTTQ_LOP_TAP_HUAN_RETURNING_FULL = MTTQ_LOP_TAP_HUAN_SELECT_FULL;

import { MTTQ_CAN_BO_EMBED_PHONG_BAN } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/core/supabase-select';

const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!mttq_lop_tap_huan_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan,id_phong_ban)';

const DON_VI_EMBED =
  'don_vi:var_ssn_xa_phuong!mttq_lop_tap_huan_don_vi_id_fkey(ten,var_ssn_tinh_thanh(ten))';

const TO_CHUC_EMBED =
  'to_chuc:mttq_thiet_lap!mttq_lop_tap_huan_to_chuc_id_fkey(ten)';

const BASE_COLS = [
  'id',
  'ten_lop_tap_huan',
  'nam_tap_huan',
  'cap_tap_huan',
  'don_vi_id',
  'to_chuc_id',
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
export const MTTQ_LOP_TAP_HUAN_SELECT_LIST = `${BASE_COLS},${NGUOI_TAO},${DON_VI_EMBED},${TO_CHUC_EMBED},mttq_lop_tap_huan_ct(count)`;

const CAN_BO_EMBED = [
  'ho_ten',
  'don_vi_id',
  'cap_quan_ly',
  'to_chuc_ids',
  'chuc_vu:var_chuc_vu!mttq_can_bo_chuc_vu_id_fkey(ten_chuc_vu)',
  'don_vi:var_ssn_xa_phuong!mttq_can_bo_don_vi_id_fkey(ten,var_ssn_tinh_thanh(ten))',
  MTTQ_CAN_BO_EMBED_PHONG_BAN,
].join(',');

const CT_FULL = `mttq_lop_tap_huan_ct(id,id_lop_tap_huan,can_bo_id,thuoc_dien,can_bo:mttq_can_bo!mttq_lop_tap_huan_ct_can_bo_id_fkey(${CAN_BO_EMBED}))`;

/** Embed lớp cha trên dòng `mttq_lop_tap_huan_ct` (danh sách phẳng). */
const LOP_FOR_CT_FLAT_LIST = [
  'id',
  'ten_lop_tap_huan',
  'nam_tap_huan',
  'cap_tap_huan',
  'don_vi_id',
  'to_chuc_id',
  'tg_cap_nhat',
  DON_VI_EMBED,
  TO_CHUC_EMBED,
  NGUOI_TAO,
].join(',');

/** Query `mttq_lop_tap_huan_ct` + lớp + cán bộ — tab Danh sách chi tiết. */
export const MTTQ_LOP_TAP_HUAN_CT_SELECT_FLAT_LIST = `id,id_lop_tap_huan,can_bo_id,thuoc_dien,lop:mttq_lop_tap_huan!mttq_lop_tap_huan_ct_id_lop_tap_huan_fkey(${LOP_FOR_CT_FLAT_LIST}),can_bo:mttq_can_bo!mttq_lop_tap_huan_ct_can_bo_id_fkey(${CAN_BO_EMBED})`;

/** Chi tiết / sau ghi: đủ dòng con + thông tin cán bộ join. */
export const MTTQ_LOP_TAP_HUAN_SELECT_FULL = `${BASE_COLS},${NGUOI_TAO},${DON_VI_EMBED},${TO_CHUC_EMBED},${CT_FULL}`;

export const MTTQ_LOP_TAP_HUAN_RETURNING_FULL = MTTQ_LOP_TAP_HUAN_SELECT_FULL;

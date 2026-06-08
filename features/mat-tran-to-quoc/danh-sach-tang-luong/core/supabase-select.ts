import { MTTQ_CAN_BO_EMBED_PHONG_BAN } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/core/supabase-select';

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

/** Embed cán bộ — cùng FK rõ ràng như tab chi tiết Tập huấn / Danh sách cán bộ. */
const CAN_BO_INNER = [
  'ho_ten',
  'phong_ban_id',
  'chuc_vu_id',
  'don_vi_id',
  'to_chuc_ids',
  'cap_quan_ly',
  'chuc_vu:var_chuc_vu!mttq_can_bo_chuc_vu_id_fkey(ten_chuc_vu)',
  'don_vi:var_ssn_xa_phuong!mttq_can_bo_don_vi_id_fkey(ten,var_ssn_tinh_thanh(ten))',
  MTTQ_CAN_BO_EMBED_PHONG_BAN,
].join(',');

const CAN_BO_EMBED = `can_bo:mttq_can_bo!mttq_tang_luong_can_bo_id_fkey(${CAN_BO_INNER})`;

const NGACH_CU = 'ngach_cu:ngach_luong_id_cu(ten,ma)';
const BAC_CU = 'bac_cu:bac_luong_id_cu(ma_bac)';
const NGACH_MOI = 'ngach_moi:ngach_luong_id_moi(ten,ma)';
const BAC_MOI = 'bac_moi:bac_luong_id_moi(ma_bac,ngach_id)';
const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!mttq_tang_luong_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)';

const EMBED_LIST = [CAN_BO_EMBED, NGACH_CU, BAC_CU, NGACH_MOI, BAC_MOI, NGUOI_TAO].join(',');

export const MTTQ_TANG_LUONG_SELECT_LIST = `${BASE_COLS},${EMBED_LIST}`;
export const MTTQ_TANG_LUONG_SELECT_FULL = MTTQ_TANG_LUONG_SELECT_LIST;
export const MTTQ_TANG_LUONG_RETURNING = BASE_COLS;

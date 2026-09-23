/**
 * Tên khoá ngoại phải khớp CHÍNH XÁC ràng buộc trong migration
 * `20260921100000_kho_don_vi_cuu_tro_mo_rong.sql`; sai một ký tự là PostgREST
 * trả 400 "could not find a relationship".
 */
const DON_VI_GIOI_THIEU_EMBED =
  'don_vi_gioi_thieu:var_ssn_xa_phuong!kho_don_vi_cuu_tro_don_vi_gioi_thieu_id_fkey(id,ten)';

const LIST_COLS = [
  'id',
  'tt',
  'loai',
  'ten',
  'so_nguoi',
  'nguoi_dai_dien',
  'chuc_vu',
  'dia_chi',
  'dien_thoai',
  'don_vi_gioi_thieu_loai',
  'don_vi_gioi_thieu_id',
  'email',
  'ghi_chu',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const KHO_DON_VI_CUU_TRO_SELECT = `${LIST_COLS},${DON_VI_GIOI_THIEU_EMBED}`;
export const KHO_DON_VI_CUU_TRO_RETURNING = KHO_DON_VI_CUU_TRO_SELECT;

import { nhanVienEmbedSelect } from '@/lib/nguoi-thao-tac';

const DON_VI_CHU_TRI = 'don_vi_chu_tri:var_ssn_xa_phuong!kho_dot_cuu_tro_don_vi_chu_tri_id_fkey(ten)';

const LIST_COLS = [
  'id',
  'tt',
  'ten',
  'loai',
  'don_vi_chu_tri_loai',
  'don_vi_chu_tri_id',
  'tu_ngay',
  'den_ngay',
  'tai_khoan_tiep_nhan',
  'ngan_hang',
  'trang_thai',
  'ngay_cap_nhat_trang_thai',
  'tien_do',
  'link',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

/** List: không select `mo_ta` (cột dài). */
export const KHO_DOT_CUU_TRO_SELECT_LIST = `${LIST_COLS},${DON_VI_CHU_TRI}`;

/** Detail + form sau khi fetch đủ. */
export const KHO_DOT_CUU_TRO_SELECT_FULL = [
  KHO_DOT_CUU_TRO_SELECT_LIST,
  'mo_ta',
  nhanVienEmbedSelect('nguoi_tao', 'kho_dot_cuu_tro_id_nguoi_tao_fkey'),
  nhanVienEmbedSelect('nguoi_cap_nhat', 'kho_dot_cuu_tro_id_nguoi_cap_nhat_fkey'),
].join(',');

export const KHO_DOT_CUU_TRO_RETURNING_LIST = KHO_DOT_CUU_TRO_SELECT_LIST;

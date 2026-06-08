const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!dttg_thong_tin_to_chuc_quan_trong_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)';

const DON_VI =
  'don_vi:var_ssn_xa_phuong!dttg_thong_tin_to_chuc_quan_trong_don_vi_id_fkey(ten,var_ssn_tinh_thanh(ten))';

const LIST_COLS = [
  'id',
  'loai_hinh',
  'ten_co_so',
  'chu_tri',
  'lich_su_hinh_thanh',
  'cong_tac_an_sinh',
  'don_vi_id',
  'dia_chi',
  'so_dien_thoai',
  'trang_thai',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const DTTG_THONG_TIN_TO_CHUC_QUAN_TRONG_SELECT = `${LIST_COLS},${DON_VI},${NGUOI_TAO}`;

export const DTTG_THONG_TIN_TO_CHUC_QUAN_TRONG_RETURNING = DTTG_THONG_TIN_TO_CHUC_QUAN_TRONG_SELECT;

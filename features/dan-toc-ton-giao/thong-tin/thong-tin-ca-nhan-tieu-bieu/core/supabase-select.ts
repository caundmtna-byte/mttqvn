const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!dttg_thong_tin_ca_nhan_tieu_bieu_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)';

const DON_VI =
  'don_vi:var_ssn_xa_phuong!dttg_thong_tin_ca_nhan_tieu_bieu_don_vi_id_fkey(ten,var_ssn_tinh_thanh(ten))';

const LIST_COLS = [
  'id',
  'ho_va_ten',
  'ngay_sinh',
  'doi_tuong',
  'chuc_vu_vi_tri',
  'ton_giao_dan_toc',
  'dia_chi',
  'don_vi_id',
  'so_dien_thoai',
  'dong_gop_noi_bat',
  'trang_thai',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_SELECT = `${LIST_COLS},${DON_VI},${NGUOI_TAO}`;

export const DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_RETURNING = DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_SELECT;

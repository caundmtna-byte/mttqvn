const XA_PHUONG = 'xa_phuong:var_ssn_xa_phuong!nddk_nha_dai_doan_ket_xa_phuong_id_fkey(ten)';
const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!nddk_nha_dai_doan_ket_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)';

const LIST_COLS = [
  'id',
  'noi_dung_ho_tro',
  'nam',
  'nguon',
  'nguon_ho_tro',
  'ho_ten_chu_ho',
  'xa_phuong_id',
  'khoi_xom',
  'doi_tuong',
  'loai_hinh_ho_tro',
  'so_tien',
  'trang_thai',
  'ngay_cap_nhat_trang_thai',
  'ghi_chu',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const NDDK_SELECT = `${LIST_COLS},${XA_PHUONG},${NGUOI_TAO}`;
export const NDDK_RETURNING = NDDK_SELECT;

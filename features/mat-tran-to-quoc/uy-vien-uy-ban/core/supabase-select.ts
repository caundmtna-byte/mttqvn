const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!mttq_uy_vien_uy_ban_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)';

const NHIEM_KY = 'nhiem_ky:mttq_nhiem_ky!mttq_uy_vien_uy_ban_nhiem_ky_id_fkey(ten_nhiem_ky)';

const DON_VI = 'don_vi:var_ssn_xa_phuong!mttq_uy_vien_uy_ban_don_vi_id_fkey(ten,id_tinh_thanh)';

const BASE_COLS = [
  'id',
  'ma_uv',
  'nhiem_ky_id',
  'don_vi_id',
  'ho_va_ten',
  'chuc_vu_don_vi',
  'ngay_sinh',
  'gioi_tinh',
  'trang_thai_tham_gia',
  'ngay_nhap_trang_thai',
  'van_hoa',
  'trinh_do_cm',
  'trinh_do_llct',
  'dan_toc',
  'ton_giao',
  'dang_vien',
  'ngay_vao_dang',
  'que_quan',
  'noi_o_hien_nay',
  'so_dien_thoai',
  'ghi_chu',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const MTTQ_UY_VIEN_UY_BAN_SELECT_LIST = `${BASE_COLS},${NHIEM_KY},${DON_VI},${NGUOI_TAO}`;

export const MTTQ_UY_VIEN_UY_BAN_SELECT_FULL = MTTQ_UY_VIEN_UY_BAN_SELECT_LIST;

export const MTTQ_UY_VIEN_UY_BAN_RETURNING_FULL = MTTQ_UY_VIEN_UY_BAN_SELECT_FULL;

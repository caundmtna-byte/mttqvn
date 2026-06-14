const EMBED = [
  'the_loai:bai_viet_thiet_lap_the_loai!bai_viet_danh_sach_id_the_loai_fkey(ten_the_loai)',
  'nguon_dang:bai_viet_thiet_lap_khac!bai_viet_danh_sach_id_nguon_dang_fkey(ten,loai)',
  'trang_dang:bai_viet_thiet_lap_khac!bai_viet_danh_sach_id_trang_dang_fkey(ten,loai)',
  'nguoi_tao:var_nhan_vien!bai_viet_danh_sach_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan,id_phong_ban,don_vi_id)',
].join(',');

const BASE_COLS = [
  'id',
  'ten_bai',
  'id_the_loai',
  'don_gia',
  'ngay_dang',
  'id_nguon_dang',
  'id_trang_dang',
  'link',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const BAI_VIET_DANH_SACH_SELECT_LIST = `${BASE_COLS},${EMBED}`;
export const BAI_VIET_DANH_SACH_SELECT_FULL = BAI_VIET_DANH_SACH_SELECT_LIST;
export const BAI_VIET_DANH_SACH_RETURNING = 'id,tg_cap_nhat';

/** @deprecated use BAI_VIET_DANH_SACH_SELECT_FULL */
export const BAI_VIET_DANH_SACH_RETURNING_FULL = BAI_VIET_DANH_SACH_SELECT_FULL;

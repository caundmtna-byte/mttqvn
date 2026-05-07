const EMBED = [
  'trach_nhiem:var_nhan_vien!cong_viec_danh_sach_id_trach_nhiem_fkey(ho_va_ten,ten_tai_khoan)',
  'nguoi_tao:var_nhan_vien!cong_viec_danh_sach_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)',
].join(',');

const BASE_COLS = [
  'id',
  'muc_do',
  'ten_cong_viec',
  'ghi_chu',
  'link_tai_lieu',
  'thoi_han',
  'tien_do',
  'id_trach_nhiem',
  'ids_ho_tro',
  'trang_thai',
  'ket_qua',
  'link_kq',
  'ngay_hoan_thanh',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const CONG_VIEC_DANH_SACH_SELECT_FULL = `${BASE_COLS},${EMBED}`;
export const CONG_VIEC_DANH_SACH_RETURNING_FULL = CONG_VIEC_DANH_SACH_SELECT_FULL;

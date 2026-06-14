const EMBED = [
  'trach_nhiem:var_nhan_vien!cong_viec_danh_sach_id_trach_nhiem_fkey(ho_va_ten,ten_tai_khoan)',
  'nguoi_tao:var_nhan_vien!cong_viec_danh_sach_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)',
  'chuong_trinh:chuong_trinh_nam!cong_viec_danh_sach_id_chuong_trinh_fkey(ten_chuong_trinh)',
].join(',');

const LIST_COLS = [
  'id',
  'muc_do',
  'ten_cong_viec',
  'thoi_han',
  'tien_do',
  'id_trach_nhiem',
  'ids_ho_tro',
  'trang_thai',
  'ket_qua',
  'link_kq',
  'ngay_hoan_thanh',
  'id_nguoi_tao',
  'id_chuong_trinh',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

const FULL_ONLY_COLS = ['ghi_chu', 'link_tai_lieu'].join(',');

/** Danh sách con trong drawer chương trình — embed trách nhiệm, không embed chương trình / người tạo. */
const EMBED_BY_CHUONG = [
  'trach_nhiem:var_nhan_vien!cong_viec_danh_sach_id_trach_nhiem_fkey(ho_va_ten,ten_tai_khoan)',
].join(',');

export const CONG_VIEC_DANH_SACH_SELECT_LIST = `${LIST_COLS},${EMBED}`;
export const CONG_VIEC_DANH_SACH_SELECT_FULL = `${LIST_COLS},${FULL_ONLY_COLS},${EMBED}`;
export const CONG_VIEC_DANH_SACH_RETURNING = 'id,tg_cap_nhat';

export const CONG_VIEC_BY_CHUONG_TRINH_SELECT = `${LIST_COLS},${EMBED_BY_CHUONG}`;

/** @deprecated use CONG_VIEC_DANH_SACH_SELECT_FULL */
export const CONG_VIEC_DANH_SACH_RETURNING_FULL = CONG_VIEC_DANH_SACH_SELECT_FULL;

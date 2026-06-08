const DOI_TUONG = 'doi_tuong:pbxh_thiet_lap!pbxh_thuc_hien_doi_tuong_id_fkey(ten)';
const DON_VI_CHU_TRI = 'don_vi_chu_tri:pbxh_thiet_lap!pbxh_thuc_hien_don_vi_chu_tri_id_fkey(ten)';
const HINH_THUC = 'hinh_thuc:pbxh_thiet_lap!pbxh_thuc_hien_hinh_thuc_id_fkey(ten)';
const PHONG_BAN = 'phong_ban:var_phong_ban!pbxh_thuc_hien_phong_ban_tham_muu_id_fkey(ten_phong_ban)';
const DON_VI_THUC_HIEN = 'don_vi_thuc_hien:var_ssn_xa_phuong!pbxh_thuc_hien_don_vi_thuc_hien_id_fkey(ten)';
const NGUOI_TAO = 'nguoi_tao:var_nhan_vien!pbxh_thuc_hien_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)';

const LIST_COLS = [
  'id',
  'cap_thuc_hien',
  'loai_hinh',
  'noi_dung',
  'doi_tuong_id',
  'hinh_thuc_id',
  'ngay_bat_dau',
  'ngay_ket_thuc',
  'mo_ta_thoi_gian',
  'tinh_trang',
  'don_vi_chu_tri_id',
  'phong_ban_tham_muu_id',
  'don_vi_thuc_hien_id',
  'ket_qua_kien_nghi',
  'phan_tram_hoan_thanh',
  'link_ket_qua',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const PBXH_THUC_HIEN_SELECT = `${LIST_COLS},${DOI_TUONG},${DON_VI_CHU_TRI},${HINH_THUC},${PHONG_BAN},${DON_VI_THUC_HIEN},${NGUOI_TAO}`;
export const PBXH_THUC_HIEN_RETURNING = PBXH_THUC_HIEN_SELECT;

/**
 * Tên khoá ngoại phải khớp CHÍNH XÁC ràng buộc trong migration
 * `20260923100000_vnn_chuong_trinh_vi_nguoi_ngheo.sql`; sai một ký tự là
 * PostgREST trả 400 "could not find a relationship".
 */
const XA_PHUONG = 'xa_phuong:var_ssn_xa_phuong!vnn_chuong_trinh_xa_phuong_id_fkey(ten)';
const DON_VI = 'don_vi_ho_tro:kho_don_vi_cuu_tro!vnn_chuong_trinh_don_vi_ho_tro_id_fkey(ten)';
const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!vnn_chuong_trinh_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)';

const LIST_COLS = [
  'id',
  'noi_dung_ho_tro',
  'nam',
  'linh_vuc_ho_tro',
  'nguon',
  'nguon_ho_tro',
  'ho_ngheo_id',
  'ho_ten_nguoi_nhan',
  'xa_phuong_id',
  'khoi_xom',
  'doi_tuong',
  'hinh_thuc_ho_tro',
  'so_tien',
  'trang_thai',
  'ngay_cap_nhat_trang_thai',
  'don_vi_ho_tro_id',
  'ghi_chu',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const VNN_SELECT = `${LIST_COLS},${XA_PHUONG},${DON_VI},${NGUOI_TAO}`;
export const VNN_RETURNING = VNN_SELECT;

/**
 * Tên khoá ngoại phải khớp CHÍNH XÁC ràng buộc đặt trong migration
 * `20260921150000_hngh_thong_tin_ho_ngheo.sql`; sai một ký tự là PostgREST trả
 * 400 "could not find a relationship".
 */
const XA_PHUONG = 'xa_phuong:var_ssn_xa_phuong!hngh_thong_tin_ho_ngheo_xa_phuong_id_fkey(ten)';
const DAN_TOC = 'dan_toc:mttq_thiet_lap!hngh_thong_tin_ho_ngheo_dan_toc_id_fkey(ten)';
const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!hngh_thong_tin_ho_ngheo_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)';

const LIST_COLS = [
  'id',
  'ho_ten_dai_dien',
  'so_cccd',
  'xa_phuong_id',
  'khoi_xom',
  'doi_tuong',
  'dien_thoai',
  'dan_toc_id',
  'ton_giao',
  'so_tai_khoan',
  'ngan_hang',
  'trang_thai',
  'ngay_cap_nhat_trang_thai',
  'ghi_chu',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const HNGH_SELECT = `${LIST_COLS},${XA_PHUONG},${DAN_TOC},${NGUOI_TAO}`;
export const HNGH_RETURNING = HNGH_SELECT;

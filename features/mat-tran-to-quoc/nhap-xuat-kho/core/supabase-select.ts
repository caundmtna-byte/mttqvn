/**
 * PostgREST select strings cho `kho_nhap_xuat_kho` (master) + `kho_nhap_xuat_kho_ct` (lines).
 *
 * - LIST: chỉ lấy cột cần cho bảng + count lines (`kho_nhap_xuat_kho_ct(count)` — egress nhẹ).
 * - FULL: dùng khi mở detail/edit — load đủ lines + ghi_chu.
 * - CT_FLAT_LIST: dùng cho tab "Chi tiết" — mỗi row = 1 line + master snapshot.
 */

const KHO_XUAT = 'kho_xuat:kho_danh_sach_kho!kho_nhap_xuat_kho_kho_xuat_id_fkey(id,ten_kho,don_vi_id)';
const KHO_NHAP = 'kho_nhap:kho_danh_sach_kho!kho_nhap_xuat_kho_kho_nhap_id_fkey(id,ten_kho,don_vi_id)';
const DON_VI = 'don_vi:kho_don_vi_cuu_tro!kho_nhap_xuat_kho_don_vi_cuu_tro_id_fkey(id,ten)';
const DOT = 'dot:kho_dot_cuu_tro!kho_nhap_xuat_kho_dot_cuu_tro_id_fkey(id,ten)';

const BASE_COLS_LIST = [
  'id',
  'tt',
  'so_phieu',
  'loai_phieu',
  'ngay_phieu',
  'kho_xuat_id',
  'kho_nhap_id',
  'don_vi_cuu_tro_id',
  'dot_cuu_tro_id',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

/** List: count lines + embed tên các tham chiếu. KHÔNG select `ghi_chu` (long-text). */
export const NHAP_XUAT_KHO_SELECT_LIST = `${BASE_COLS_LIST},${KHO_XUAT},${KHO_NHAP},${DON_VI},${DOT},kho_nhap_xuat_kho_ct(count)`;

/** Returning sau insert/update master: đủ field cho list + count = 0/cap_nhat. */
export const NHAP_XUAT_KHO_RETURNING_LIST = NHAP_XUAT_KHO_SELECT_LIST;

const HANG_HOA_FOR_CT =
  'hang_hoa:kho_danh_sach_hang_hoa!kho_nhap_xuat_kho_ct_hang_hoa_fkey(id,ten_hang_hoa)';

const CT_COLS_FULL = [
  'id',
  'phieu_id',
  'hang_hoa_id',
  'don_vi_tinh',
  'so_luong',
  'don_gia',
  'thanh_tien',
  'ghi_chu',
  'thu_tu',
].join(',');

/** Full master (cho detail/edit): + ghi_chu + lines đầy đủ. */
export const NHAP_XUAT_KHO_SELECT_FULL = [
  BASE_COLS_LIST,
  'ghi_chu',
  KHO_XUAT,
  KHO_NHAP,
  DON_VI,
  DOT,
  `kho_nhap_xuat_kho_ct(${CT_COLS_FULL},${HANG_HOA_FOR_CT})`,
].join(',');

/** Tab "Chi tiết" (flat lines) — mỗi row = 1 line + embed master + hàng hóa. */
const PHIEU_FOR_CT_FLAT = [
  'id',
  'so_phieu',
  'loai_phieu',
  'ngay_phieu',
  'kho_xuat_id',
  'kho_nhap_id',
  'don_vi_cuu_tro_id',
  'dot_cuu_tro_id',
  KHO_XUAT,
  KHO_NHAP,
  DON_VI,
  DOT,
].join(',');

export const NHAP_XUAT_KHO_CT_SELECT_FLAT_LIST = [
  'id',
  'phieu_id',
  'hang_hoa_id',
  'don_vi_tinh',
  'so_luong',
  'don_gia',
  'thanh_tien',
  'ghi_chu',
  HANG_HOA_FOR_CT,
  `phieu:kho_nhap_xuat_kho!kho_nhap_xuat_kho_ct_phieu_fkey(${PHIEU_FOR_CT_FLAT})`,
].join(',');

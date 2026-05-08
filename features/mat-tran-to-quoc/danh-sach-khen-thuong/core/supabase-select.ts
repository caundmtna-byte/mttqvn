const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!mttq_khen_thuong_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan,id_phong_ban)';

const BASE_COLS = [
  'id',
  'so_qd',
  'ngay_khen_thuong',
  'don_vi_de_xuat',
  'ghi_chu',
  'trang_thai',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

/**
 * Danh sách: dùng aggregate `count` thay vì kéo mảng id dòng con.
 * Trước: `mttq_khen_thuong_ct(id)` → ship mảng id (mỗi quyết định N×8 byte) chỉ để `arr.length`.
 * Sau: `mttq_khen_thuong_ct(count)` → trả 1 số nguyên — egress giảm O(N).
 */
export const MTTQ_KHEN_THUONG_SELECT_LIST = `${BASE_COLS},${NGUOI_TAO},mttq_khen_thuong_ct(count)`;

const CT_FULL =
  'mttq_khen_thuong_ct(id,id_khen_thuong,can_bo_id,hinh_thuc_khen,danh_hieu,noi_dung_khen,ho_so_khen,can_bo:mttq_can_bo!mttq_khen_thuong_ct_can_bo_id_fkey(ho_ten))';

/** Chi tiết / sau ghi: đủ dòng con + tên cán bộ. */
export const MTTQ_KHEN_THUONG_SELECT_FULL = `${BASE_COLS},${NGUOI_TAO},${CT_FULL}`;

export const MTTQ_KHEN_THUONG_RETURNING_FULL = MTTQ_KHEN_THUONG_SELECT_FULL;

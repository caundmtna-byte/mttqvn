const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!mttq_ky_hop_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)';

const NHIEM_KY = 'nhiem_ky:mttq_nhiem_ky!mttq_ky_hop_nhiem_ky_id_fkey(ten_nhiem_ky)';

const DON_VI = 'don_vi:var_ssn_xa_phuong!mttq_ky_hop_don_vi_id_fkey(ten,id_tinh_thanh)';

/** Cột ngắn — render ở grid danh sách kỳ họp. Bỏ long-text khỏi LIST để giảm egress. */
const LIST_COLS = [
  'id',
  'nhiem_ky_id',
  'don_vi_id',
  'ky_thu',
  'ngay_hop',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

/** Cột long-text chỉ hiện ở detail / form sửa. */
const FULL_COLS = [LIST_COLS, 'noi_dung_ky_hop', 'tai_lieu_hop', 'ghi_chu'].join(',');

export const MTTQ_KY_HOP_SELECT_LIST = `${LIST_COLS},${NHIEM_KY},${DON_VI},${NGUOI_TAO}`;

export const MTTQ_KY_HOP_SELECT_FULL = `${FULL_COLS},${NHIEM_KY},${DON_VI},${NGUOI_TAO}`;

export const MTTQ_KY_HOP_RETURNING = 'id,tg_cap_nhat';

/** @deprecated use MTTQ_KY_HOP_RETURNING + getById */
export const MTTQ_KY_HOP_RETURNING_FULL = MTTQ_KY_HOP_SELECT_FULL;

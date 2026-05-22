const DM_EMBED = 'kho_danh_muc_hang_hoa!kho_danh_sach_hang_hoa_id_danh_muc_fkey(ten_danh_muc)';

const HANG_LIST_COLS = [
  'id',
  'id_danh_muc',
  'ten_hang_hoa',
  'don_vi_tinh',
  'mo_ta',
  'quy_cach',
  'thu_tu',
  'trang_thai',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const KHO_DANH_MUC_HANG_HOA_SELECT = [
  'id',
  'ten_danh_muc',
  'mo_ta',
  'thu_tu',
  'trang_thai',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const KHO_DANH_MUC_HANG_HOA_RETURNING = KHO_DANH_MUC_HANG_HOA_SELECT;

export const KHO_DANH_SACH_HANG_HOA_SELECT = `${HANG_LIST_COLS},${DM_EMBED}`;
export const KHO_DANH_SACH_HANG_HOA_RETURNING = KHO_DANH_SACH_HANG_HOA_SELECT;

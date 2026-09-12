/**
 * Danh mục tài khoản không có cột nặng nào (không ảnh, không text dài bắt buộc)
 * nên list và detail dùng chung một chuỗi select — xem `docs/supabase-egress.md`:
 * không bao giờ `select('*')`.
 */
export const QUY_DANH_MUC_TAI_KHOAN_SELECT = [
  'id',
  'quy',
  'ten',
  'so_tai_khoan',
  'ngan_hang',
  'mo_ta',
  'trang_thai',
  'thu_tu',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const QUY_DANH_MUC_TAI_KHOAN_RETURNING = QUY_DANH_MUC_TAI_KHOAN_SELECT;

/** Chỉ những cột cần cho ô chọn tài khoản khi lập phiếu. */
export const QUY_TAI_KHOAN_OPTION_SELECT = [
  'id',
  'ten',
  'so_tai_khoan',
  'ngan_hang',
  'trang_thai',
  'thu_tu',
].join(',');

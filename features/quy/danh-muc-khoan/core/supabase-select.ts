/** Không `select('*')` — xem `docs/supabase-egress.md`. */
export const QUY_DANH_MUC_KHOAN_SELECT = [
  'id',
  'quy',
  'loai',
  'ten',
  'mo_ta',
  'thu_tu',
  'trang_thai',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const QUY_DANH_MUC_KHOAN_RETURNING = QUY_DANH_MUC_KHOAN_SELECT;

/** Chỉ những cột cần cho ô chọn khoản mục khi lập phiếu. */
export const QUY_KHOAN_OPTION_SELECT = ['id', 'loai', 'ten', 'trang_thai', 'thu_tu'].join(',');

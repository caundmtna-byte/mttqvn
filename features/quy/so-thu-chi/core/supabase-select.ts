/**
 * Đọc MỘT phiếu (sau khi lưu, hoặc khi mở lại chi tiết).
 *
 * Danh sách đi qua RPC `get_quy_so_thu_chi_page` (đã LEFT JOIN sẵn tên), nên
 * chuỗi này chỉ dùng cho một dòng. Chỉ nhúng hai khóa ngoại ĐƠN (`don_vi_id`,
 * `id_nguoi_tao`); tên khoản mục và tên tài khoản lấy từ cache danh mục mà
 * trang đã tải sẵn cho ô chọn — rẻ hơn và không phụ thuộc vào việc nhúng khóa
 * ngoại GHÉP `(khoan_id, loai)`.
 */
const COLS = [
  'id',
  'quy',
  'loai',
  'so_chung_tu',
  'ngay_chung_tu',
  'khoan_id',
  'tai_khoan_id',
  'so_tien',
  'noi_dung',
  'nguoi_nop_nhan',
  'don_vi_id',
  'chung_tu_goc',
  'ghi_chu',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

const DON_VI = 'don_vi:var_ssn_xa_phuong!quy_so_thu_chi_don_vi_id_fkey(ten)';
const NGUOI_TAO = 'nguoi_tao:var_nhan_vien!quy_so_thu_chi_id_nguoi_tao_fkey(ho_va_ten)';

export const QUY_SO_THU_CHI_SELECT = `${COLS},${DON_VI},${NGUOI_TAO}`;
export const QUY_SO_THU_CHI_RETURNING = QUY_SO_THU_CHI_SELECT;

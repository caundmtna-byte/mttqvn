/**
 * Các key dùng cho ô tìm kiếm tổng trên danh sách ủy viên ủy ban.
 * Chỉ liệt kê key có trong `MTTQ_UY_VIEN_UY_BAN_SELECT_LIST` để tránh phí egress —
 * tìm theo cột long-text (que_quan, noi_o_hien_nay, ghi_chu, …) chỉ khả dụng trong detail.
 */
export const MTTQ_UY_VIEN_UY_BAN_SEARCHABLE_KEYS: string[] = [
  'ma_uv',
  'ngay_sinh',
  'ten_nhiem_ky',
  'ho_va_ten',
  'ten_don_vi',
  'chuc_vu_don_vi',
  'gioi_tinh',
  'trang_thai_tham_gia',
  'so_ky_hop',
  'diem_danh_co_mat',
  'diem_danh_vang_mat',
  'diem_danh_chua',
  'ho_va_ten_nguoi_tao',
  'ten_tai_khoan_nguoi_tao',
];

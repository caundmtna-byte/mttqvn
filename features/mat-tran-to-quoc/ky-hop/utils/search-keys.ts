/**
 * Các key dùng cho ô tìm kiếm tổng trên danh sách kỳ họp.
 * Chỉ giữ key có trong `MTTQ_KY_HOP_SELECT_LIST` — long-text (noi_dung_ky_hop, tai_lieu_hop,
 * ghi_chu) không có trong LIST để giảm egress, nên cũng không tìm được ở list view.
 */
export const MTTQ_KY_HOP_SEARCHABLE_KEYS: string[] = [
  'ten_nhiem_ky',
  'ky_thu',
  'ngay_hop',
  'ten_don_vi',
  'ho_va_ten_nguoi_tao',
  'ten_tai_khoan_nguoi_tao',
];

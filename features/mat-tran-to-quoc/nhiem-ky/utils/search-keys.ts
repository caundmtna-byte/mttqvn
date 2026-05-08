/**
 * Các key dùng cho ô tìm kiếm tổng trên danh sách nhiệm kỳ.
 * Long-text (`thong_tin`, `ghi_chu`) đã bị bỏ khỏi LIST select để giảm egress;
 * tìm theo các trường này chỉ khả dụng khi mở detail.
 */
export const MTTQ_NHIEM_KY_SEARCHABLE_KEYS: string[] = [
  'ten_nhiem_ky',
  'tu_nam',
  'den_nam',
  'ho_va_ten_nguoi_tao',
  'ten_tai_khoan_nguoi_tao',
];

/**
 * Các key dùng cho ô tìm kiếm tổng trên danh sách nhiệm kỳ.
 * Long-text (`thong_tin`, `ghi_chu`) đã bị bỏ khỏi LIST select để giảm egress;
 * tìm theo các trường này chỉ khả dụng khi mở detail.
 */
export const MTTQ_NHIEM_KY_SEARCHABLE_KEYS: string[] = [
  'ten_nhiem_ky',
  'tu_nam',
  'den_nam',
  'sl_dang_tham_gia',
  'sl_dau_nhiem_ky',
  'sl_thoi_tham_gia',
  'sl_can_bo_sung',
  'sl_thieu',
  'tg_cap_nhat',
  'ho_va_ten_nguoi_tao',
  'ten_tai_khoan_nguoi_tao',
];

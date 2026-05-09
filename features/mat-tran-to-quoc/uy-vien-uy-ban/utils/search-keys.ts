/**
 * Các key dùng cho ô tìm kiếm tổng trên danh sách ủy viên ủy ban.
 * Chỉ liệt kê key có trong payload flatten (LIST + embed cán bộ) — tìm theo long-text
 * (ghi_chu, …) chỉ khả dụng trong detail; quê quán / nơi ở nằm trên hồ sơ cán bộ (embed).
 */
export const MTTQ_UY_VIEN_UY_BAN_SEARCHABLE_KEYS: string[] = [
  'can_bo_id',
  'ma_uv',
  'ngay_sinh',
  'ten_nhiem_ky',
  'ho_va_ten',
  'ten_don_vi',
  'chuc_vu_don_vi',
  'gioi_tinh',
  'trang_thai_tham_gia',
  'ten_to_chuc',
  'ten_phong_ban_hien_thi',
  'ten_don_vi_can_bo',
  'dia_chi_can_bo',
  'so_ky_hop',
  'diem_danh_co_mat',
  'diem_danh_vang_mat',
  'diem_danh_chua',
  'ho_va_ten_nguoi_tao',
  'ten_tai_khoan_nguoi_tao',
];

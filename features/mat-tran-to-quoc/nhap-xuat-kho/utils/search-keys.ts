/** Cột dùng cho ô search tổng tab Danh sách (master) — không cần `ghi_chu`. */
export const NHAP_XUAT_KHO_SEARCHABLE_KEYS = [
  'so_phieu',
  'ten_kho_xuat',
  'ten_kho_nhap',
  'ten_don_vi_cuu_tro',
  'ten_dot_cuu_tro',
] as const;

/** Cột search tổng cho tab Chi tiết (flat lines). */
export const NHAP_XUAT_KHO_CT_FLAT_SEARCHABLE_KEYS = [
  'so_phieu',
  'ten_hang_hoa',
  'ten_kho_xuat',
  'ten_kho_nhap',
  'ten_don_vi_cuu_tro',
  'ten_dot_cuu_tro',
  'don_vi_tinh',
] as const;

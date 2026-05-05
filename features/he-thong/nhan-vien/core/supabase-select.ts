/**
 * PostgREST `.select()` cho bảng nhân viên — không dùng `*` để giảm egress (Supabase).
 * Giữ đồng bộ với các cột dùng trong form/chi tiết.
 */
export const HE_THONG_NHAN_VIEN_ROW_COLUMNS = [
  'id',
  'ma_nhan_vien',
  'ho_ten',
  'email',
  'so_dien_thoai',
  'phong_ban_id',
  'chuc_vu_id',
  'chi_nhanh_id',
  'gioi_tinh',
  'trang_thai',
  'ngay_vao_lam',
  'anh_dai_dien',
  'ngay_sinh',
  'cmnd_cccd',
  'ngay_cap_cccd',
  'noi_cap_cccd',
  'quoc_tich',
  'dan_toc',
  'ton_giao',
  'tinh_thanh',
  'quan_huyen',
  'phuong_xa',
  'dia_chi_cu_the',
  'dia_chi_tam_tru',
  'cap_bac_id',
  'loai_hop_dong',
  'ngay_het_han_hd',
  'noi_lam_viec',
  'email_ca_nhan',
  'nguoi_lien_he_khan_cap',
  'sdt_khan_cap',
  'quan_he_khan_cap',
  'tinh_trang_hon_nhan',
  'so_nguoi_phu_thuoc',
  'trinh_do_hoc_van',
  'chuyen_nganh',
  'truong_hoc',
  'nam_tot_nghiep',
  'chung_chi',
  'so_tai_khoan',
  'ten_ngan_hang',
  'chi_nhanh_nh',
  'ma_so_thue_ca_nhan',
  'so_bhxh',
  'so_bhyt',
  'ngay_tham_gia_bh',
  'noi_dang_ky_kcb',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
].join(',');

/** Đọc danh sách / chi tiết: cột bảng + embed tên hiển thị. */
export const EMPLOYEE_SELECT_FULL = `${HE_THONG_NHAN_VIEN_ROW_COLUMNS},he_thong_phong_ban(ten_phong_ban),he_thong_chuc_vu(ten_chuc_vu),he_thong_chi_nhanh(ten_chi_nhanh)`;

/** Sau insert/update khi cần đủ dữ liệu form — trùng đọc đầy đủ. */
export const EMPLOYEE_RETURNING_FULL = EMPLOYEE_SELECT_FULL;

/**
 * Cập nhật chỉ trạng thái: tối thiểu bytes trả về (hook merge vào cache).
 * Vẫn embed tên để một dòng list không mất label nếu có refetch.
 */
export const EMPLOYEE_RETURNING_STATUS_ONLY = `id,trang_thai,updated_at,he_thong_phong_ban(ten_phong_ban),he_thong_chuc_vu(ten_chuc_vu),he_thong_chi_nhanh(ten_chi_nhanh)`;

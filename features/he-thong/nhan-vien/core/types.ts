import type { TrangThaiNhanVien } from './constants';

export type Gender = 'Nam' | 'Nữ' | 'Khác';

export interface Employee {
  id: string;
  ma_nhan_vien: string;
  ho_ten: string;
  email: string;
  so_dien_thoai: string;

  // Foreign Keys
  phong_ban_id: string | null;
  chuc_vu_id: string | null;
  chi_nhanh_id?: string | null;

  // Display Names (Populated)
  ten_phong_ban?: string;
  ten_chuc_vu?: string;
  ten_chi_nhanh?: string;

  gioi_tinh: Gender;
  trang_thai: TrangThaiNhanVien;
  ngay_vao_lam: string;
  anh_dai_dien?: string;

  // --- Thông tin cá nhân ---
  ngay_sinh?: string;
  cmnd_cccd?: string;
  ngay_cap_cccd?: string;
  noi_cap_cccd?: string;
  quoc_tich?: string;
  dan_toc?: string;
  ton_giao?: string;

  // --- Địa chỉ ---
  tinh_thanh?: string;
  quan_huyen?: string;
  phuong_xa?: string;
  dia_chi_cu_the?: string;
  dia_chi_tam_tru?: string;

  // --- Công việc (mở rộng) ---
  cap_bac_id?: string | null;
  ten_cap_bac?: string;
  loai_hop_dong?: string;
  ngay_het_han_hd?: string | null;
  noi_lam_viec?: string;

  // --- Liên hệ (mở rộng) ---
  email_ca_nhan?: string;
  nguoi_lien_he_khan_cap?: string;
  sdt_khan_cap?: string;
  quan_he_khan_cap?: string;

  // --- Hôn nhân & Gia đình ---
  tinh_trang_hon_nhan?: string;
  so_nguoi_phu_thuoc?: number;

  // --- Học vấn ---
  trinh_do_hoc_van?: string;
  chuyen_nganh?: string;
  truong_hoc?: string;
  nam_tot_nghiep?: string;
  chung_chi?: string;

  // --- Tài chính & Ngân hàng ---
  so_tai_khoan?: string;
  ten_ngan_hang?: string;
  chi_nhanh_nh?: string;
  ma_so_thue_ca_nhan?: string;

  // --- Bảo hiểm ---
  so_bhxh?: string;
  so_bhyt?: string;
  ngay_tham_gia_bh?: string;
  noi_dang_ky_kcb?: string;

  // --- Audit / Metadata ---
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface EmployeeFilters {
  /** Ô tìm theo từng cột (id cột → chuỗi con, không phân biệt hoa thường). */
  columnSearch: Record<string, string>;
  trang_thai: string[];
  phong_ban_id: string[];
  gender: string[];
  position: string[];
}

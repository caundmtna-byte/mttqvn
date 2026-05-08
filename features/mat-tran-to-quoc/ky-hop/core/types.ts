export interface MttqKyHopFilters {
  columnSearch: Record<string, string>;
  nhiem_ky_filter: string[];
  don_vi_filter: string[];
  /** Năm từ `ngay_hop` (chuỗi năm, ví dụ "2024"). */
  nam_filter: string[];
}

export interface MttqKyHop {
  id: string;
  nhiem_ky_id: string;
  ten_nhiem_ky: string;
  don_vi_id: string | null;
  /** Tên xã/phường từ join; null khi cấp tỉnh. */
  ten_don_vi: string | null;
  ky_thu: string;
  ngay_hop: string | null;
  noi_dung_ky_hop: string | null;
  tai_lieu_hop: string | null;
  ghi_chu: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
  /** Tóm tắt điểm danh (view / batch). */
  diem_danh_co_mat: number;
  diem_danh_vang_mat: number;
  diem_danh_chua: number;
}

export type MttqKyHopListRow = MttqKyHop;

export type MttqDiemDanhTrangThai = 'Có mặt' | 'Vắng mặt';

/** Một dòng view `v_diem_danh_ky_hop_summary` (theo kỳ họp). */
export interface MttqKyHopDiemDanhSummary {
  ky_hop_id: string;
  co_mat: number;
  vang_mat: number;
  chua_diem_danh: number;
}

/** Một dòng view `v_diem_danh_uy_vien_summary` (theo ủy viên). */
export interface MttqUyVienDiemDanhSummary {
  uy_vien_id: string;
  so_ky_hop: number;
  co_mat: number;
  vang_mat: number;
  chua_diem_danh: number;
}

export interface MttqDiemDanhUyVien {
  id: string;
  ky_hop_id: string;
  uy_vien_id: string;
  trang_thai: MttqDiemDanhTrangThai;
  ghi_chu: string | null;
}

/**
 * Dữ liệu tối giản cho ma trận điểm danh — chỉ gồm 3 cột cần thiết.
 * Trả về bởi RPC `get_diem_danh_for_nhiem_ky`, giảm egress ~40% so với
 * fetch raw `mttq_diem_danh_uy_vien` (bỏ id UUID + ghi_chu).
 */
export interface MttqDiemDanhMatrixRow {
  ky_hop_id: string;
  uy_vien_id: string;
  trang_thai: MttqDiemDanhTrangThai;
}

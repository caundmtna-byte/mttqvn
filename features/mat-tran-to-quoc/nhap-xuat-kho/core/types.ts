import type { NhapXuatKhoLoaiPhieu } from './constants';

/** Pattern B (header cột + ô search tổng) cho tab Danh sách (master phiếu). */
export interface NhapXuatKhoFilters {
  columnSearch: Record<string, string>;
  /** Bộ lọc loại phiếu (chip dropdown). `null` = tất cả. */
  loai_phieu: NhapXuatKhoLoaiPhieu | null;
}

/** Pattern B cho tab Chi tiết (flatten lines). */
export interface NhapXuatKhoCtFlatFilters {
  columnSearch: Record<string, string>;
  loai_phieu: NhapXuatKhoLoaiPhieu | null;
  kho_id: string | null;
  hang_hoa_id: string | null;
}

/** Hàng list — không gồm cột nặng (`ghi_chu`) và lines chỉ count. */
export interface NhapXuatKhoListRow {
  id: string;
  tt: number;
  so_phieu: string;
  loai_phieu: NhapXuatKhoLoaiPhieu;
  ngay_phieu: string;
  kho_xuat_id: string | null;
  ten_kho_xuat: string | null;
  kho_nhap_id: string | null;
  ten_kho_nhap: string | null;
  don_vi_cuu_tro_id: string | null;
  ten_don_vi_cuu_tro: string | null;
  dot_cuu_tro_id: string | null;
  ten_dot_cuu_tro: string | null;
  /** Số dòng chi tiết (PostgREST aggregate `(count)`). */
  so_dong: number;
  tg_tao: string;
  tg_cap_nhat: string;
}

/** 1 dòng chi tiết hàng hóa của 1 phiếu. */
export interface NhapXuatKhoCtRow {
  id: string;
  phieu_id: string;
  hang_hoa_id: string;
  ten_hang_hoa: string | null;
  don_vi_tinh: string;
  so_luong: number;
  don_gia: number;
  thanh_tien: number;
  ghi_chu: string | null;
  thu_tu: number;
}

/** Detail (master + lines + ghi_chu). */
export interface NhapXuatKhoDetail extends NhapXuatKhoListRow {
  ghi_chu: string | null;
  chi_tiet: NhapXuatKhoCtRow[];
}

/** Dòng phẳng cho tab "Chi tiết" — mỗi row = 1 dòng `kho_nhap_xuat_kho_ct` + master snapshot. */
export interface NhapXuatKhoCtFlatRow {
  id: string;
  phieu_id: string;
  so_phieu: string;
  loai_phieu: NhapXuatKhoLoaiPhieu;
  ngay_phieu: string;
  ten_kho_xuat: string | null;
  ten_kho_nhap: string | null;
  ten_don_vi_cuu_tro: string | null;
  ten_dot_cuu_tro: string | null;
  hang_hoa_id: string;
  ten_hang_hoa: string | null;
  don_vi_tinh: string;
  so_luong: number;
  don_gia: number;
  thanh_tien: number;
  ghi_chu: string | null;
}

/** Tồn kho 1 (kho, hàng) lookup từ `kho_ton_kho_view`. */
export interface KhoTonKhoRow {
  kho_id: string;
  hang_hoa_id: string;
  ton_kho: number;
}

import type { NhapXuatKhoLoaiPhieu } from '../../nhap-xuat-kho/core/constants';
import type { NhapXuatKhoCtFlatRow } from '../../nhap-xuat-kho/core/types';
import type { KhoDonViCuuTroLoai } from '../../don-vi-cuu-tro/core/loai';

export interface ReliefSupportDimensionFilters {
  kho_id: string[];
  loai_phieu: NhapXuatKhoLoaiPhieu[];
  don_vi_cuu_tro_id: string[];
  dot_cuu_tro_id: string[];
  hang_hoa_id: string[];
  id_danh_muc: string[];
}

export interface ResolvedReliefDateRange {
  start: string;
  end: string;
  allTime?: boolean;
}

export interface ReliefSupportLookupRow extends NhapXuatKhoCtFlatRow {
  loai_phieu_label: string;
  kho_label: string;
  nguon_dich_label: string;
  ten_danh_muc: string | null;
}

export interface ReliefSupportKpis {
  phieuCount: number;
  lineCount: number;
  nhapSoLuong: number;
  nhapThanhTien: number;
  xuatSoLuong: number;
  xuatThanhTien: number;
  chuyenSoLuong: number;
  donViCoPhatSinh: number;
  dotCoXuat: number;
  tonTongSoLuong: number;
  khoCoHang: number;
}

export interface ReliefSupportTrendPoint {
  key: string;
  label: string;
  nhap: number;
  xuat: number;
}

export interface ReliefSupportLabelValueRow {
  id: string;
  label: string;
  value: number;
  soLuong?: number;
}

export interface ReliefSupportStatsResult {
  filtered: ReliefSupportLookupRow[];
  kpis: ReliefSupportKpis;
  trendSeries: ReliefSupportTrendPoint[];
  topDonVi: ReliefSupportLabelValueRow[];
  topDot: ReliefSupportLabelValueRow[];
  byLoaiDonVi: ReliefSupportLabelValueRow[];
  topHangNhap: ReliefSupportLabelValueRow[];
  topHangXuat: ReliefSupportLabelValueRow[];
}

export interface ReliefSupportMasterMaps {
  donViMap: Record<string, { ten: string; loai: KhoDonViCuuTroLoai; loai_label: string }>;
  dotMap: Record<string, { ten: string }>;
  hangMap: Record<
    string,
    { ten_hang_hoa: string; don_vi_tinh: string; id_danh_muc: string; ten_danh_muc_nhom: string }
  >;
  khoMap: Record<string, { ten_kho: string; ten_don_vi: string | null }>;
}

export type ReliefSupportLookupSortKey =
  | 'ngay_phieu'
  | 'so_phieu'
  | 'loai_phieu'
  | 'kho_label'
  | 'nguon_dich_label'
  | 'ten_hang_hoa'
  | 'so_luong'
  | 'thanh_tien';

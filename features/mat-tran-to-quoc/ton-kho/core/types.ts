import type { NhapXuatKhoLoaiPhieu } from '../../nhap-xuat-kho/core/constants';

/** Một ô ma trận từ `kho_ton_kho_view`. */
export interface TonKhoRecord {
  kho_id: string;
  hang_hoa_id: string;
  ton_kho: number;
}

/** Dòng hiển thị tab Tồn hàng (đã join kho + hàng). */
export interface TonKhoDisplayRow extends TonKhoRecord {
  ten_kho: string;
  ten_hang_hoa: string;
  don_vi_tinh: string;
  ten_danh_muc?: string;
  id_danh_muc?: string | null;
}

/** Gom theo hàng hóa (tab Tồn hàng). */
export interface TonKhoProductAgg {
  hang_hoa_id: string;
  ten_hang_hoa: string;
  ten_danh_muc?: string;
  id_danh_muc?: string | null;
  don_vi_tinh: string;
  tong_so_luong: number;
  so_kho_co_ton: number;
  rows: TonKhoDisplayRow[];
}

export interface TonKhoByProductFilters {
  warehouseIds: string[];
  categoryIds: string[];
}

/** Bộ lọc báo cáo NXT kỳ. */
export interface NXTFilters {
  dateFrom: string;
  dateTo: string;
  warehouseIds: string[];
  loaiPhieu: NhapXuatKhoLoaiPhieu[];
  hangHoaIds: string[];
  categoryIds: string[];
}

/** Tổng hợp NXT theo kho (kỳ). */
export interface NXTByWarehouseRow {
  kho_id: string;
  ten_kho: string;
  ton_dau_ky: number;
  tong_nhap: number;
  tong_xuat: number;
  ton_cuoi_ky: number;
}

/** Tổng hợp NXT theo hàng hóa (kỳ). */
export interface NXTByProductRow {
  hang_hoa_id: string;
  ten_hang_hoa: string;
  ten_danh_muc?: string;
  don_vi_tinh: string;
  ton_dau_ky: number;
  tong_nhap: number;
  tong_xuat: number;
  ton_cuoi_ky: number;
}

export interface NXTByPeriodResult {
  byWarehouse: NXTByWarehouseRow[];
  byProduct: NXTByProductRow[];
}

export interface TonKhoSummaryTotals {
  ton_dau_ky: number;
  tong_nhap: number;
  tong_xuat: number;
  ton_cuoi_ky: number;
}

/** Một dòng lịch sử NX của hàng trong drawer tồn theo SP. */
export interface TonKhoHangNxHistoryRow {
  chi_tiet_id: string;
  phieu_id: string;
  so_phieu: string;
  ngay_phieu: string;
  loai_phieu: NhapXuatKhoLoaiPhieu;
  kho_xuat_id: string | null;
  kho_nhap_id: string | null;
  ten_kho_xuat: string | null;
  ten_kho_nhap: string | null;
  so_luong: number;
  don_vi_tinh: string;
}

/** Dòng dùng tính luỹ kế tồn sau mỗi chi tiết. */
export interface LichSuNhapXuatRow {
  id_chi_tiet: string;
  id_hang_hoa: string;
  ngay: string;
  loai: NhapXuatKhoLoaiPhieu;
  so_luong: number;
  kho_xuat_id?: string | null;
  kho_nhap_id?: string | null;
}

import type { LoaiPhieuKhoPT } from '../../phieu-kho-phan-thuoc/core/types';

/** Một ô ma trận từ view v_farm_ton_kho_phan_thuoc */
export interface TonKhoPTRecord {
  id_kho: string;
  id_hang_hoa: string;
  so_luong: number;
}

/** Dòng hiển thị tab Tồn kho (đã join kho + hàng) */
export interface TonKhoPTDisplayRow extends TonKhoPTRecord {
  ma_kho: string;
  ten_kho: string;
  ma_hang: string;
  ten_hang: string;
  don_vi_tinh: string;
  ten_danh_muc?: string;
  danh_muc_id?: string | null;
}

/** Gom theo hàng (tab Chi tiết) */
export interface TonKhoPTProductAgg {
  id_hang_hoa: string;
  ma_hang: string;
  ten_hang: string;
  ten_danh_muc?: string;
  danh_muc_id?: string | null;
  don_vi_tinh: string;
  tong_so_luong: number;
  so_kho_co_ton: number;
  rows: TonKhoPTDisplayRow[];
}

/** Bộ lọc báo cáo NXT phân thuốc */
export interface NXTPTFilters {
  dateFrom: string;
  dateTo: string;
  warehouseIds: string[];
  loaiPhieu: LoaiPhieuKhoPT[];
  hangHoaIds: string[];
  categoryIds: string[];
}

/** Tổng hợp NXT theo kho (kỳ) */
export interface NXTByWarehousePTRow {
  id_kho: string;
  ma_kho: string;
  ten_kho: string;
  ton_dau_ky: number;
  tong_nhap: number;
  tong_xuat: number;
  ton_cuoi_ky: number;
}

/** Tổng hợp NXT theo hàng hóa (kỳ) */
export interface NXTByProductPTRow {
  id_hang_hoa: string;
  ma_hang: string;
  ten_hang: string;
  ten_danh_muc?: string;
  don_vi_tinh: string;
  ton_dau_ky: number;
  tong_nhap: number;
  tong_xuat: number;
  ton_cuoi_ky: number;
}

export interface NXTPTByPeriodResult {
  byWarehouse: NXTByWarehousePTRow[];
  byProduct: NXTByProductPTRow[];
}

/** Tổng 4 số trên summary cards */
export interface TonKhoPTSummaryTotals {
  ton_dau_ky: number;
  tong_nhap: number;
  tong_xuat: number;
  ton_cuoi_ky: number;
}

/** Alias theo plan: tổng 4 số summary */
export type TonKhoPTSummaryRow = TonKhoPTSummaryTotals;

/** Dòng flat từ view (đủ để tính NXT client-side) */
export interface FarmPhieuKhoPTFlatRow {
  id_phieu_kho: number;
  so_phieu: string;
  ngay: string;
  loai: string;
  kho_id: number;
  kho_den_id: number | null;
  trang_thai: string;
  id_hang_hoa: number;
  so_luong: number | string | null;
  ma_hang: string | null;
}

/** Một dòng lịch sử NX (nhập/xuất/chuyển) của hàng trong drawer tồn theo SP */
export interface TonKhoPTHangNxHistoryRow {
  chi_tiet_id: number;
  id_phieu_kho: number;
  so_phieu: string;
  ngay: string;
  loai: string;
  kho_id: string;
  kho_den_id: string | null;
  /** Thời gian tạo phiếu — sắp xếp luỹ kế tồn */
  phieu_tg_tao?: string | null;
  ten_kho: string | null;
  ten_kho_den: string | null;
  trang_thai: string;
  so_luong: number;
  don_vi_tinh: string | null;
}

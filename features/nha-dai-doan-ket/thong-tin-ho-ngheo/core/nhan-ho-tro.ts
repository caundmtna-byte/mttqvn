/** Một hộ trong tab "Thống kê nhận hỗ trợ" — RPC `get_hngh_nhan_ho_tro_page`. */
export interface HnghNhanHoTroRow {
  id: string;
  ho_ten_dai_dien: string;
  so_cccd: string | null;
  xa_phuong_id: string | null;
  ten_xa_phuong: string | null;
  khoi_xom: string | null;
  doi_tuong: string | null;
  vnn_tien: number;
  vnn_hien_vat: number;
  vnn_so_khoan: number;
  nddk_tien: number;
  nddk_so_can: number;
  kho_gia_tri: number;
  kho_so_phieu: number;
  tong_gia_tri: number;
}

/** Dòng tổng KPI — RPC `get_hngh_nhan_ho_tro_tong`. */
export interface HnghNhanHoTroTong {
  so_ho: number;
  so_ho_da_nhan: number;
  vnn_tien: number;
  vnn_hien_vat: number;
  nddk_tien: number;
  kho_gia_tri: number;
  tong_gia_tri: number;
}

export interface HnghNhanHoTroFilters {
  columnSearch: Record<string, string>;
  nam_filter: string[];
  xa_phuong_filter: string[];
  doi_tuong_filter: string[];
  /** 'da_nhan' (mặc định) | 'tat_ca'. */
  pham_vi: 'da_nhan' | 'tat_ca';
}

/** Phiếu xuất kho gắn một hộ — mục ở chi tiết hộ. */
export interface HnghPhieuXuatKho {
  id: string;
  so_phieu: string;
  ngay_phieu: string;
  ten_kho_xuat: string | null;
  ten_chuong_trinh: string | null;
  tong_tien: number;
}

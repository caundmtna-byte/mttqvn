export interface KhoDanhMucHangHoaFilters {
  columnSearch: Record<string, string>;
  mo_ta_bucket: '' | 'has' | 'empty';
  /** '' = tất cả trạng thái */
  trang_thai: string;
}

export interface KhoDanhMucHangHoaListRow {
  id: string;
  ten_danh_muc: string;
  mo_ta: string | null;
  thu_tu: number;
  trang_thai: string;
  tg_tao: string;
  tg_cap_nhat: string;
}

export type KhoDanhMucHangHoaDetail = KhoDanhMucHangHoaListRow;

export interface KhoDanhSachHangHoaFilters {
  columnSearch: Record<string, string>;
  mo_ta_bucket: '' | 'has' | 'empty';
  /** '' = tất cả */
  id_danh_muc: string;
  /** '' = tất cả trạng thái */
  trang_thai: string;
}

export interface KhoDanhSachHangHoaListRow {
  id: string;
  id_danh_muc: string;
  ten_danh_muc_nhom: string;
  ten_hang_hoa: string;
  don_vi_tinh: string;
  mo_ta: string | null;
  quy_cach: string | null;
  thu_tu: number;
  trang_thai: string;
  tg_tao: string;
  tg_cap_nhat: string;
}

export type KhoDanhSachHangHoaDetail = KhoDanhSachHangHoaListRow;

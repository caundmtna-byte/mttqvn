/** Bộ lọc danh sách kho — Pattern B (header cột + ô search tổng). */
export interface KhoDanhSachKhoFilters {
  columnSearch: Record<string, string>;
}

export interface KhoDanhSachKhoListRow {
  id: string;
  /** Thứ tự hiển thị — DB gán tự tăng khi tạo mới. */
  tt: number;
  ten_kho: string;
  /** `null` khi kho không gắn xã/phường. */
  don_vi_id: string | null;
  ten_don_vi: string | null;
  ten_tinh: string | null;
  mo_ta: string | null;
  tg_tao: string;
  tg_cap_nhat: string;
}

export type KhoDanhSachKhoDetail = KhoDanhSachKhoListRow;

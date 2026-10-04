/** Bộ lọc danh sách kho — Pattern B (header cột + ô search tổng). */
export interface KhoDanhSachKhoFilters {
  columnSearch: Record<string, string>;
  don_vi_id: string[];
  ten_tinh: string[];
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
  /** Họ tên người tạo / người sửa gần nhất (trigger máy chủ gán) — `null` khi chưa có. */
  ten_nguoi_tao?: string | null;
  ten_nguoi_cap_nhat?: string | null;
}

export type KhoDanhSachKhoDetail = KhoDanhSachKhoListRow;

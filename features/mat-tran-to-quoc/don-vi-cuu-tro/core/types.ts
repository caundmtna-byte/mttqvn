export type KhoDonViCuuTroLoai = 'to_chuc' | 'ca_nhan';

/** Bộ lọc danh sách — Pattern B (header cột + ô search tổng). */
export interface KhoDonViCuuTroFilters {
  columnSearch: Record<string, string>;
}

export interface KhoDonViCuuTroListRow {
  id: string;
  tt: number;
  loai: KhoDonViCuuTroLoai;
  /** Nhãn tiếng Việt — dùng hiển thị và tìm kiếm tổng. */
  loai_label: string;
  ten: string;
  dia_chi: string | null;
  dien_thoai: string | null;
  email: string | null;
  ghi_chu: string | null;
  tg_tao: string;
  tg_cap_nhat: string;
}

export type KhoDonViCuuTroDetail = KhoDonViCuuTroListRow;

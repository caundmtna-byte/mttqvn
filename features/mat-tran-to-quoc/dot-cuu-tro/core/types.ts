/** Bộ lọc danh sách — Pattern B (header cột + ô search tổng). */
export interface KhoDotCuuTroFilters {
  columnSearch: Record<string, string>;
  /** '' = tất cả; has/empty theo cột link trên list. */
  link_bucket: '' | 'has' | 'empty';
}

/** Hàng list — không gồm `mo_ta` (egress). */
export interface KhoDotCuuTroListRow {
  id: string;
  tt: number;
  ten: string;
  link: string | null;
  tg_tao: string;
  tg_cap_nhat: string;
}

export interface KhoDotCuuTroDetail extends KhoDotCuuTroListRow {
  mo_ta: string | null;
}

/** Bộ lọc danh sách ngạch — Pattern B (header cột + ô search tổng). */
export interface LuongThietLapNgachFilters {
  columnSearch: Record<string, string>;
  mo_ta_bucket: '' | 'has' | 'empty';
}

export interface LuongThietLapNgachListRow {
  id: string;
  ma: string | null;
  ten: string;
  mo_ta: string | null;
  thu_tu: number;
  tg_tao: string;
  tg_cap_nhat: string;
}

export type LuongThietLapNgachDetail = LuongThietLapNgachListRow;

export interface LuongThietLapBacRow {
  id: string;
  ngach_id: string;
  ma_bac: string;
  he_so: string;
  thu_tu: number;
  tg_tao: string;
  tg_cap_nhat: string;
}

export interface LuongThietLapCauHinhRow {
  id: string;
  muc_luong_co_so: string;
  tg_tao: string;
  tg_cap_nhat: string;
}

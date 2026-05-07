export interface MttqKyHopFilters {
  columnSearch: Record<string, string>;
  nhiem_ky_filter: string[];
  don_vi_filter: string[];
  /** Năm từ `ngay_hop` (chuỗi năm, ví dụ "2024"). */
  nam_filter: string[];
}

export interface MttqKyHop {
  id: string;
  nhiem_ky_id: string;
  ten_nhiem_ky: string;
  don_vi_id: string | null;
  /** Tên xã/phường từ join; null khi cấp tỉnh. */
  ten_don_vi: string | null;
  ky_thu: string;
  ngay_hop: string | null;
  noi_dung_ky_hop: string | null;
  tai_lieu_hop: string | null;
  ghi_chu: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
}

export type MttqKyHopListRow = MttqKyHop;

import type { DotLoai, DotTrangThai } from './constants';

/** Bộ lọc danh sách — Pattern B (header cột + ô search tổng). */
export interface KhoDotCuuTroFilters {
  columnSearch: Record<string, string>;
  /** '' = tất cả. */
  loai: '' | DotLoai;
  trang_thai: '' | DotTrangThai;
}

/** Hàng list — không gồm `mo_ta` (egress). */
export interface KhoDotCuuTroListRow {
  id: string;
  tt: number;
  ten: string;
  loai: DotLoai;
  /** 'tinh' ⇒ MTTQ tỉnh chủ trì; 'xa_phuong' ⇒ `don_vi_chu_tri_id` là xã. */
  don_vi_chu_tri_loai: 'tinh' | 'xa_phuong';
  don_vi_chu_tri_id: string | null;
  /** Nhãn hiển thị gộp: "MTTQ tỉnh" hoặc tên xã/phường. */
  don_vi_chu_tri_label: string;
  tu_ngay: string | null;
  den_ngay: string | null;
  tai_khoan_tiep_nhan: string | null;
  ngan_hang: string | null;
  trang_thai: DotTrangThai;
  ngay_cap_nhat_trang_thai: string;
  tien_do: string | null;
  /** Văn bản phát động (URL). */
  link: string | null;
  tg_tao: string;
  tg_cap_nhat: string;
}

export interface KhoDotCuuTroDetail extends KhoDotCuuTroListRow {
  mo_ta: string | null;
  ten_nguoi_tao?: string | null;
  ten_nguoi_cap_nhat?: string | null;
}

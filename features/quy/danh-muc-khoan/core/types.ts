import type { QuyKey, QuyLoai, QuyTrangThai } from '../../core/constants';

/** Bộ lọc danh mục khoản thu / khoản chi. */
export interface QuyDanhMucKhoanFilters {
  columnSearch: Record<string, string>;
  loai: string[];
  trang_thai: string[];
}

export interface QuyDanhMucKhoanListRow {
  id: string;
  quy: QuyKey;
  loai: QuyLoai;
  ten: string;
  mo_ta: string | null;
  thu_tu: number;
  trang_thai: QuyTrangThai;
  tg_tao: string;
  tg_cap_nhat: string;
}

export type QuyDanhMucKhoanDetail = QuyDanhMucKhoanListRow;

/** Tùy chọn cho ô chọn khoản mục khi lập phiếu. */
export interface QuyKhoanOption {
  id: string;
  loai: QuyLoai;
  ten: string;
  trang_thai: QuyTrangThai;
}

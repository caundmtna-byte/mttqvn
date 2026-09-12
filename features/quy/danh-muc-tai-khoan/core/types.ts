import type { QuyKey, QuyTrangThai } from '../../core/constants';

/** Bộ lọc danh mục tài khoản — Pattern B (header cột + ô search tổng). */
export interface QuyDanhMucTaiKhoanFilters {
  columnSearch: Record<string, string>;
  trang_thai: string[];
  /** 'tien_mat' | 'ngan_hang' — suy từ việc có số tài khoản hay không. */
  hinh_thuc: string[];
}

export interface QuyDanhMucTaiKhoanListRow {
  id: string;
  quy: QuyKey;
  ten: string;
  so_tai_khoan: string | null;
  ngan_hang: string | null;
  mo_ta: string | null;
  trang_thai: QuyTrangThai;
  thu_tu: number;
  tg_tao: string;
  tg_cap_nhat: string;
}

export type QuyDanhMucTaiKhoanDetail = QuyDanhMucTaiKhoanListRow;

/** Tùy chọn cho ô chọn tài khoản khi lập phiếu. */
export interface QuyTaiKhoanOption {
  id: string;
  ten: string;
  so_tai_khoan: string | null;
  ngan_hang: string | null;
  trang_thai: QuyTrangThai;
}

import type { KhoDonViCuuTroLoai } from './loai';
import type { DonViGioiThieuLoai } from '../utils/don-vi-gioi-thieu';

export type { KhoDonViCuuTroLoai };

/** Bộ lọc danh sách — Pattern B (header cột + ô search tổng). */
export interface KhoDonViCuuTroFilters {
  columnSearch: Record<string, string>;
  loai_filter: string[];
  don_vi_gioi_thieu_filter: string[];
}

export interface KhoDonViCuuTroListRow {
  id: string;
  tt: number;
  loai: KhoDonViCuuTroLoai;
  /** Nhãn tiếng Việt — dùng hiển thị và tìm kiếm tổng. */
  loai_label: string;
  ten: string;
  /** Số thành viên của nhóm / CLB. `null` = chưa nhập (khác hẳn `0`). */
  so_nguoi: number | null;
  nguoi_dai_dien: string | null;
  chuc_vu: string | null;
  dia_chi: string | null;
  dien_thoai: string | null;
  don_vi_gioi_thieu_loai: DonViGioiThieuLoai | null;
  don_vi_gioi_thieu_id: string | null;
  /** Tên xã/phường từ join; `null` khi cấp tỉnh hoặc chưa nhập. */
  ten_don_vi_gioi_thieu: string | null;
  /** Chuỗi hiển thị gộp — bảng, chi tiết, xuất file, tìm và sắp xếp dùng chung. */
  don_vi_gioi_thieu_label: string;
  email: string | null;
  ghi_chu: string | null;
  tg_tao: string;
  tg_cap_nhat: string;
}

export type KhoDonViCuuTroDetail = KhoDonViCuuTroListRow;

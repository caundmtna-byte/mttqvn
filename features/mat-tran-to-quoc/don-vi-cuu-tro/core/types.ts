import type { KhoDonViCuuTroLoai } from './loai';
import type { DonViGioiThieuLoai } from '../utils/don-vi-gioi-thieu';

export type { KhoDonViCuuTroLoai };

/** Bộ lọc danh sách — Pattern B (header cột + ô search tổng). */
export interface KhoDonViCuuTroFilters {
  columnSearch: Record<string, string>;
  loai_filter: string[];
  don_vi_gioi_thieu_filter: string[];
  /** Chip "Đợt / Nội dung" — chọn thì các cột kết quả chỉ tính trong nhóm đó. */
  nhom_ung_ho_filter: string[];
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
  /** Mã số thuế — in lên Biên bản xác nhận khoản tài trợ. */
  ma_so_thue?: string | null;
  ghi_chu: string | null;
  tg_tao: string;
  tg_cap_nhat: string;
  /** Họ tên người tạo / người sửa gần nhất (trigger máy chủ gán) — `null` khi chưa có. */
  ten_nguoi_tao?: string | null;
  ten_nguoi_cap_nhat?: string | null;
  /** Tiền mặt ủng hộ (đồng). `null` = chưa tải số ủng hộ. */
  tien_mat_ung_ho: number | null;
  /** Hiện vật quy ra tiền (đồng): giá trị hàng nhập kho + hiện vật quy đổi ở Chương trình hỗ trợ. */
  hien_vat_ung_ho: number | null;
  /** Tổng = tiền mặt + hiện vật. Trang ghép từ RPC nhóm, không đọc từ bảng. */
  ket_qua_ung_ho: number | null;
}

export type KhoDonViCuuTroDetail = KhoDonViCuuTroListRow;

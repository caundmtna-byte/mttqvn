import type { MttqTapHuanCap, MttqTapHuanThuocDien } from './constants';

export interface MttqLopTapHuanFilters {
  columnSearch: Record<string, string>;
  cap_tap_huan: string[];
  nam_tap_huan: string[];
  /** FK xã/phường lớp; `__empty__` = cấp tỉnh / chưa gắn đơn vị. */
  don_vi_id: string[];
}

/** Dòng chi tiết (bảng con), id string khi đã lưu DB. */
export interface MttqLopTapHuanCt {
  id: string;
  id_lop_tap_huan: string;
  can_bo_id: string;
  /** Chức vụ — suy ra từ join `mttq_can_bo` (không cột DB trên `mttq_lop_tap_huan_ct`). */
  chuc_vu: string | null;
  /** Tổ chức (join `mttq_can_bo`). */
  ten_to_chuc?: string | null;
  /** Phòng ban hiển thị: phòng ban cha · bộ phận nếu có. */
  ten_phong_ban?: string | null;
  /** Gộp tổ chức — phòng ban (tương thích / export); suy ra từ join. */
  don_vi_cong_tac: string | null;
  thuoc_dien: MttqTapHuanThuocDien;
  /** Họ tên cán bộ (join từ mttq_can_bo). */
  ten_can_bo?: string | null;
  /** Đơn vị xã/phường trên hồ sơ cán bộ (join `mttq_can_bo.don_vi_id`). */
  ten_don_vi_can_bo?: string | null;
  /** `var_chuc_vu.cap_quan_ly` từ embed cán bộ — hiển thị đơn vị (Tỉnh → `-`). */
  chuc_vu_cap_quan_ly?: string | null;
}

/** Bản ghi cha + danh sách con (đã join). */
export interface MttqLopTapHuan {
  id: string;
  ten_lop_tap_huan: string;
  nam_tap_huan: number;
  cap_tap_huan: MttqTapHuanCap;
  /** FK `var_ssn_xa_phuong.id` — bắt buộc khi `cap_tap_huan` = Cấp xã. */
  don_vi_id: string | null;
  /** Nhãn xã — tỉnh (embed), phục vụ hiển thị. */
  ten_don_vi?: string | null;
  ghi_chu: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
  /** `var_nhan_vien.id_phong_ban` của người tạo — phục vụ gating phân quyền xem. */
  id_phong_ban_nguoi_tao?: string | null;
  chi_tiet: MttqLopTapHuanCt[];
}

/** Dòng bảng danh sách — chỉ cần số lượng dòng con. */
export interface MttqLopTapHuanListRow extends Omit<MttqLopTapHuan, 'chi_tiet'> {
  so_dong: number;
}

/**
 * Một dòng `mttq_lop_tap_huan_ct` + thông tin lớp cha + cán bộ (tab Danh sách chi tiết).
 * `id` là id dòng chi tiết (CT), không phải id lớp.
 */
export interface MttqTapHuanChiTietFlatRow {
  id: string;
  id_lop_tap_huan: string;
  ten_lop_tap_huan: string;
  nam_tap_huan: number;
  cap_tap_huan: MttqTapHuanCap;
  /** FK lớp `mttq_lop_tap_huan.don_vi_id` — gating Cấp xã + Xã phường. */
  don_vi_id: string | null;
  ten_don_vi_lop: string | null;
  tg_cap_nhat_lop: string;
  id_phong_ban_nguoi_tao: string | null;
  can_bo_id: string;
  ten_can_bo: string | null;
  ten_to_chuc: string | null;
  ten_phong_ban: string | null;
  chuc_vu: string | null;
  ten_don_vi_can_bo: string | null;
  /** `var_chuc_vu.cap_quan_ly` từ embed cán bộ — hiển thị đơn vị (Tỉnh → `-`). */
  chuc_vu_cap_quan_ly?: string | null;
  thuoc_dien: MttqTapHuanThuocDien;
}

/** Bộ lọc tab chi tiết — cấp / năm / thuộc diện + columnSearch (không dùng don_vi_id lớp). */
export interface MttqTapHuanChiTietListFilters extends Omit<MttqLopTapHuanFilters, 'don_vi_id'> {
  thuoc_dien: string[];
}

import type { MttqTapHuanCap, MttqTapHuanThuocDien } from './constants';

export interface MttqLopTapHuanFilters {
  columnSearch: Record<string, string>;
  cap_tap_huan: string[];
  nam_tap_huan: string[];
}

/** Dòng chi tiết (bảng con), id string khi đã lưu DB. */
export interface MttqLopTapHuanCt {
  id: string;
  id_lop_tap_huan: string;
  can_bo_id: string;
  /** Chức vụ (lưu trên dòng chi tiết — snapshot tại thời điểm tham gia). */
  chuc_vu: string | null;
  /** Đơn vị công tác (lưu trên dòng chi tiết — snapshot). */
  don_vi_cong_tac: string | null;
  thuoc_dien: MttqTapHuanThuocDien;
  /** Họ tên cán bộ (join từ mttq_can_bo). */
  ten_can_bo?: string | null;
  /** Tên cấp quản lý (join mttq_thiet_lap loai='cap_quan_ly'). */
  ten_cap_quan_ly?: string | null;
}

/** Bản ghi cha + danh sách con (đã join). */
export interface MttqLopTapHuan {
  id: string;
  ten_lop_tap_huan: string;
  nam_tap_huan: number;
  cap_tap_huan: MttqTapHuanCap;
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

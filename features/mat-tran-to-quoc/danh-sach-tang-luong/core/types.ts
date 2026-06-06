/** Loại kỳ tăng lương. */
export type MttqTangLuongLoaiKy = 'dung_han' | 'truoc_han_6' | 'truoc_han_9' | 'truoc_han_12';

export interface MttqTangLuongFilters {
  columnSearch: Record<string, string>;
  loai_ky: string[];
  can_bo_id: string[];
  phong_ban_id: string[];
  don_vi_id: string[];
  to_chuc_id: string[];
}

export interface MttqTangLuongListRow {
  id: string;
  can_bo_id: string;
  ngay_nang_luong: string;
  loai_ky: MttqTangLuongLoaiKy;
  ngach_luong_id_cu: string | null;
  bac_luong_id_cu: string | null;
  ngach_luong_id_moi: string;
  bac_luong_id_moi: string;
  so_thang_rut_ngan: number | null;
  ngay_den_han_goc: string | null;
  /** Snapshot lương (VND) tại thời điểm ghi nhận = MLCS × hệ số bậc mới. */
  luong: number;
  ghi_chu: string | null;
  file_quyet_dinh: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  /** Embed cán bộ */
  ho_ten_can_bo: string;
  phong_ban_id: string | null;
  don_vi_id: string | null;
  to_chuc_id: string | null;
  ten_phong_ban: string | null;
  ten_bo_phan: string | null;
  ten_don_vi: string | null;
  ten_to_chuc: string | null;
  /** Embed ngạch/bậc */
  ten_ngach_cu: string | null;
  ma_bac_cu: string | null;
  ten_ngach_moi: string;
  ma_bac_moi: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
  /** `mttq_can_bo.cap_quan_ly` — dùng để lọc dòng cho nhân sự cấp Tỉnh. */
  can_bo_cap_quan_ly: string[];
}

export type MttqTangLuongDetail = MttqTangLuongListRow;

/** Dòng kế hoạch năm (client projection). */
export interface MttqTangLuongKeHoachRow {
  can_bo_id: string;
  ho_ten: string;
  ten_phong_ban: string | null;
  ten_don_vi: string | null;
  ten_to_chuc: string | null;
  ngay_nang_gan_nhat: string;
  next_due: string;
  ten_ngach_hien_tai: string | null;
  ma_bac_hien_tai: string | null;
  ngach_luong_id_moi: string | null;
  bac_luong_id_moi: string | null;
  daysUntilDue: number;
  warningLevel: 'none' | 'd30' | 'd60' | 'd90';
}

export type MttqTangLuongKeHoachGroupMode = 'quarter' | 'month';

import type { CongViecMucDo, CongViecTrangThai } from '@/features/quan-ly-giao-viec/cong-viec/core/constants';

/** Khoảng ngày đã giải xong dạng YYYY-MM-DD (đóng [start, end]). */
export interface ResolvedDateRange {
  start: string;
  end: string;
}

/** Bộ lọc kích hoạt 7 RPC báo cáo công việc. */
export interface TaskReportFilters {
  /** Bắt buộc: khoảng `tg_tao::date`. */
  range: ResolvedDateRange;
  /** Lọc theo `id_trach_nhiem` (string vì JSON Supabase trả bigint as number/string). */
  idTrachNhiem: string[];
  /** Lọc theo `id_nguoi_tao`. */
  idNguoiTao: string[];
  /** Lọc theo enum trạng thái (mảng rỗng = không lọc). */
  trangThai: CongViecTrangThai[];
  /** Lọc theo enum mức độ (mảng rỗng = không lọc). */
  mucDo: CongViecMucDo[];
  /** Chỉ hiển thị việc quá hạn (days_to_deadline < 0). */
  overdueOnly: boolean;
  /** Phân quyền — `var_nhan_vien.id` của user hiện tại (null nếu chưa map). */
  viewerId: number | null;
  /** Phân quyền — `var_nhan_vien.don_vi_id` của user hiện tại. */
  viewerDonViId: number | null;
  /** Phân quyền — true ⇒ bypass gating (cap_bac=1, Tỉnh, hoặc quan_tri/admin). */
  viewAll: boolean;
}

/** Tham số chuẩn truyền cho mọi RPC `cong_viec_bao_cao_*`. */
export interface TaskReportRpcArgs {
  p_start: string;
  p_end: string;
  p_id_trach_nhiem: number[] | null;
  p_id_nguoi_tao: number[] | null;
  p_trang_thai: CongViecTrangThai[] | null;
  p_muc_do: CongViecMucDo[] | null;
  p_overdue_only: boolean;
  /** Phân quyền — viewer (`nhan_vien_id`) để khớp `id_nguoi_tao` / `ids_ho_tro`. */
  p_viewer_id: number | null;
  /** Phân quyền — `don_vi_id` viewer để khớp đơn vị của trách nhiệm (Xã phường). */
  p_viewer_don_vi_id: number | null;
  /** Phân quyền — true ⇒ bypass mọi gating. */
  p_view_all: boolean;
}

/** Kết quả KPI tổng quan (1 row). */
export interface TaskReportKpi {
  total: number;
  moi: number;
  dang: number;
  hoan_thanh: number;
  tam_dung: number;
  huy: number;
  qua_han: number;
  sap_het_han: number;
  hoan_thanh_dung_han: number;
  distinct_trach_nhiem: number;
  distinct_nguoi_tao: number;
}

export type TaskReportTrendBucket = 'auto' | 'day' | 'month';

/** 1 điểm trên line chart xu hướng. */
export interface TaskReportTrendPoint {
  bucket_key: string;
  label: string;
  created: number;
  done: number;
  overdue: number;
}

/** 1 dòng phân bố theo trạng thái / mức độ (pie / bar). */
export interface TaskReportEnumCount<T extends string = string> {
  value: T;
  count: number;
}

/** 1 dòng top N nhân viên (trách nhiệm / người giao). */
export interface TaskReportPersonRow {
  id: string;
  ho_va_ten: string | null;
  ten_tai_khoan: string | null;
  total: number;
  hoan_thanh: number;
  qua_han: number;
  /** Optional vì chỉ TopTrachNhiem trả về. */
  dang?: number;
  /** % hoàn thành (0–100). */
  completion_rate: number | null;
}

export type TaskReportLookupSort =
  | 'thoi_han_desc'
  | 'thoi_han_asc'
  | 'tien_do_desc'
  | 'trang_thai_asc'
  | 'tg_cap_nhat_desc';

/** 1 row trong bảng tra cứu (đã JOIN tên + tính `days_to_deadline`). */
export interface TaskReportLookupRow {
  id: string;
  muc_do: CongViecMucDo;
  ten_cong_viec: string;
  ghi_chu: string | null;
  link_tai_lieu: string | null;
  thoi_han: string | null;
  tien_do: number;
  id_trach_nhiem: string;
  ids_ho_tro: string[];
  trang_thai: CongViecTrangThai;
  ket_qua: string | null;
  link_kq: string | null;
  ngay_hoan_thanh: string | null;
  id_nguoi_tao: string;
  /** Có thể bổ sung từ RPC tra cứu sau này; hiện thường null. */
  id_chuong_trinh?: string | null;
  ten_chuong_trinh?: string | null;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_trach_nhiem: string | null;
  ten_tai_khoan_trach_nhiem: string | null;
  ho_va_ten_nguoi_tao: string | null;
  ten_tai_khoan_nguoi_tao: string | null;
  days_to_deadline: number | null;
  /** Tổng số row khớp filter (window count) — đã trả ở mỗi row. */
  total_count: number;
}

/** Option { id, label, count } trả về từ RPC filter_options. */
export interface TaskReportOption {
  id: string;
  label: string;
  count: number;
}

/** Kết quả filter_options: 2 array nhân viên xuất hiện trong kỳ. */
export interface TaskReportFilterOptions {
  trach_nhiem: TaskReportOption[];
  nguoi_tao: TaskReportOption[];
}

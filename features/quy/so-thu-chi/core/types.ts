import type { DateRangeValue } from '@/components/ui/DateRangePicker';
import type { QuyKey, QuyLoai } from '../../core/constants';

/**
 * Bộ lọc sổ thu chi.
 *
 * Mọi ô ở đây đều được đẩy XUỐNG MÁY CHỦ (`get_quy_so_thu_chi_page`). Lọc ở
 * client sẽ chỉ lọc được trang đang xem — với sổ quỹ thì đó là số liệu sai.
 */
export interface QuySoThuChiFilters {
  columnSearch: Record<string, string>;
  /** Rỗng hoặc chọn cả hai ⇒ không lọc theo loại. */
  loai: string[];
  khoan_ids: string[];
  tai_khoan_ids: string[];
  dateRange: DateRangeValue;
}

export interface QuySoThuChiListRow {
  id: string;
  quy: QuyKey;
  loai: QuyLoai;
  so_chung_tu: string;
  ngay_chung_tu: string;
  khoan_id: string;
  ten_khoan: string | null;
  tai_khoan_id: string;
  ten_tai_khoan: string | null;
  so_tien: number;
  noi_dung: string;
  nguoi_nop_nhan: string | null;
  don_vi_id: string | null;
  ten_don_vi: string | null;
  chung_tu_goc: string | null;
  ghi_chu: string | null;
  id_nguoi_tao: string | null;
  ho_va_ten_nguoi_tao: string | null;
  tg_tao: string;
  tg_cap_nhat: string;
}

export type QuySoThuChiDetail = QuySoThuChiListRow;

/** Tổng thu / tổng chi của TOÀN BỘ tập đã lọc (không phải của trang đang xem). */
export interface QuySoThuChiTong {
  tongThu: number;
  tongChi: number;
  soDu: number;
}

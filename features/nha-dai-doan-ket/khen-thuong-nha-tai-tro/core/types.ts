import type { KtntCapKhen, KtntTrangThai } from './constants';

export interface KhenThuongNhaTaiTroFilters {
  columnSearch: Record<string, string>;
  nam_filter: string[];
  cap_khen_filter: string[];
  trang_thai_filter: string[];
  xa_phuong_filter: string[];
  loai_nha_tai_tro_filter: string[];
  nha_tai_tro_filter: string[];
}

/**
 * Một quyết định khen. Các cột "thành tích" (`so_khoan_ho_tro`…) KHÔNG lưu ở
 * bảng — RPC `get_ktnt_page` tính từ `vnn_chuong_trinh` mỗi lần đọc.
 */
export interface KhenThuongNhaTaiTro {
  id: string;
  noi_dung_khen: string;
  /** `YYYY-MM-DD`. */
  ngay_khen: string;
  so_quyet_dinh: string | null;
  cap_khen: KtntCapKhen;
  don_vi_khen: string | null;
  /** Chỉ có khi cấp xã. */
  xa_phuong_id: string | null;
  ten_xa_phuong: string | null;
  nha_tai_tro_id: string;
  ten_nha_tai_tro: string | null;
  /** Khoá `kho_don_vi_cuu_tro.loai` (doanh_nghiep…) — nhãn qua `khoDonViCuuTroLoaiLabel`. */
  loai_nha_tai_tro: string | null;
  nam_thanh_tich_tu: number | null;
  nam_thanh_tich_den: number | null;
  gia_tri_dong_gop_khac: number | null;
  so_khoan_ho_tro: number;
  so_nguoi_duoc_ho_tro: number;
  tong_tien_ho_tro: number;
  /** `tong_tien_ho_tro` + `gia_tri_dong_gop_khac`. */
  tong_gia_tri: number;
  trang_thai: KtntTrangThai;
  ngay_cap_nhat_trang_thai: string;
  nguoi_duyet_id: string | null;
  ho_va_ten_nguoi_duyet: string | null;
  tg_duyet: string | null;
  ghi_chu: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
}

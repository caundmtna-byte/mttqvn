import type {
  VnnDoiTuong,
  VnnHinhThuc,
  VnnLinhVuc,
  VnnNguon,
  VnnNguonHoTro,
  VnnTrangThai,
} from './constants';
import type { VnnBienBanBanGiao } from './bien-ban-ban-giao';
import type { VnnPhieuKhaoSat } from './phieu-khao-sat';

export interface ViNguoiNgheoFilters {
  columnSearch: Record<string, string>;
  nam_filter: string[];
  linh_vuc_filter: string[];
  nguon_filter: string[];
  nguon_ho_tro_filter: string[];
  doi_tuong_filter: string[];
  hinh_thuc_filter: string[];
  trang_thai_filter: string[];
  xa_phuong_filter: string[];
}

/** Một khoản hỗ trợ. Mọi id là `string` — quy ước chung toàn repo. */
export interface ViNguoiNgheo {
  id: string;
  noi_dung_ho_tro: string;
  nam: number;
  linh_vuc_ho_tro: VnnLinhVuc;
  nguon: VnnNguon;
  nguon_ho_tro: VnnNguonHoTro;
  /** Hộ nghèo được liên kết (tuỳ chọn). Họ tên/xã… vẫn lưu riêng ở các cột dưới. */
  ho_ngheo_id: string | null;
  ho_ten_nguoi_nhan: string;
  xa_phuong_id: string | null;
  ten_xa_phuong: string | null;
  khoi_xom: string | null;
  doi_tuong: VnnDoiTuong | null;
  hinh_thuc_ho_tro: VnnHinhThuc;
  /** VND, không phần lẻ. `null` khi chỉ có hiện vật hoặc chưa chốt mức. */
  so_tien: number | null;
  /** Ba cột hiện vật — chỉ có giá trị khi `vnnCoHienVat(hinh_thuc_ho_tro)`. */
  so_luong: number | null;
  tong_tien_quy_doi: number | null;
  tong_tien_ban_giao: number | null;
  trang_thai: VnnTrangThai;
  /** Máy chủ gán khi `trang_thai` đổi — không có ô nhập trên form. */
  ngay_cap_nhat_trang_thai: string;
  don_vi_ho_tro_id: string | null;
  ten_don_vi_ho_tro: string | null;
  ghi_chu: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
  /**
   * Phiếu khảo sát in — CHỈ có khi dòng đọc bằng `VNN_SELECT_FULL` (chi tiết /
   * sửa / in). Dòng từ RPC phân trang không có ⇒ `undefined`, nghĩa là "chưa
   * tải", KHÔNG phải "trống". `null` = lĩnh vực không có phiếu / chưa nhập.
   */
  phieu_khao_sat?: VnnPhieuKhaoSat | null;
  /** Biên bản bàn giao in — cùng quy ước `undefined` = chưa tải, `null` = chưa nhập. */
  bien_ban_ban_giao?: VnnBienBanBanGiao | null;
}

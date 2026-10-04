import type {
  NddkDoiTuong,
  NddkLoaiHinh,
  NddkNguon,
  NddkNguonHoTro,
  NddkNhuCauHoTro,
  NddkTrangThai,
} from './constants';

export interface NhaDaiDoanKetFilters {
  columnSearch: Record<string, string>;
  nam_filter: string[];
  nguon_filter: string[];
  nguon_ho_tro_filter: string[];
  doi_tuong_filter: string[];
  loai_hinh_filter: string[];
  trang_thai_filter: string[];
  xa_phuong_filter: string[];
}

export interface NhaDaiDoanKet {
  id: string;
  noi_dung_ho_tro: string;
  nam: number;
  nguon: NddkNguon;
  nguon_ho_tro: NddkNguonHoTro;
  /**
   * Hộ trong Thông tin đối tượng hỗ trợ. Bắt buộc với hồ sơ mới; hồ sơ cũ có thể `null`.
   * Họ tên / xã / khối xóm / đối tượng do trigger DB chép từ hộ.
   */
  ho_ngheo_id: string | null;
  ho_ten_chu_ho: string;
  xa_phuong_id: string | null;
  ten_xa_phuong: string | null;
  khoi_xom: string | null;
  doi_tuong: NddkDoiTuong | null;
  loai_hinh_ho_tro: NddkLoaiHinh;
  /** VND, không phần lẻ. `null` khi hồ sơ còn ở bước khảo sát, chưa chốt mức hỗ trợ. */
  so_tien: number | null;
  /** Nhà tài trợ (kho_don_vi_cuu_tro) — có khi nguồn "Ủng hộ trực tiếp". */
  nha_tai_tro_id?: string | null;
  ten_nha_tai_tro?: string | null;
  trang_thai: NddkTrangThai;
  /** Máy chủ gán khi `trang_thai` đổi — không có ô nhập trên form. */
  ngay_cap_nhat_trang_thai: string;
  ghi_chu: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
  /** Trigger `fn_gan_nguoi_cap_nhat` gán — form không gửi. */
  id_nguoi_cap_nhat?: string | null;
  ho_va_ten_nguoi_cap_nhat?: string | null;
  ten_tai_khoan_nguoi_cap_nhat?: string | null;
  /**
   * Dữ liệu 3 biên bản — CHỈ có khi dòng được đọc bằng `NDDK_SELECT_FULL`
   * (chi tiết / sửa / in). Dòng từ RPC phân trang không có ⇒ `undefined`,
   * nghĩa là "chưa tải", KHÔNG phải "trống".
   */
  bien_ban?: NddkBienBan;
}

/** Một người trong biên bản: họ tên + chức vụ, gõ tự do hoặc chọn từ cán bộ MTTQ. */
export interface NddkNguoiThamGia {
  ho_ten: string;
  chuc_vu: string;
}

/** Mục I "Thành phần kiểm tra" của biên bản hoàn thành (cột jsonb). */
export interface NddkThanhPhanKiemTra {
  bcd: NddkNguoiThamGia;
  ubnd: NddkNguoiThamGia;
  mttq: NddkNguoiThamGia;
  /** Đại diện thôn/khối/xóm/bản — tối đa 3. */
  thon: NddkNguoiThamGia[];
}

/** Một nguồn ngoài Chương trình trong mục "Tổng giá trị" (cột jsonb). */
export interface NddkNguonKhac {
  ten: string;
  so_tien: number | null;
}

export interface NddkBienBan {
  // Phiếu khảo sát
  /** `YYYY-MM-DD` */
  ngay_khao_sat: string | null;
  hien_trang_nha: string | null;
  hoan_canh_gia_dinh: string | null;
  nhu_cau_ho_tro: NddkNhuCauHoTro | null;
  ghi_chu_khao_sat: string | null;
  // Biên bản kiểm tra hoàn thành
  ngay_kiem_tra_hoan_thanh: string | null;
  thanh_phan_kiem_tra: NddkThanhPhanKiemTra | null;
  /** m² */
  dien_tich_san: number | null;
  phan_nen: string | null;
  phan_mai: string | null;
  phan_khung_tuong: string | null;
  /** VND — tổng giá trị công trình, gồm cả phần Chương trình (`so_tien`). */
  tong_gia_tri: number | null;
  nguon_khac: NddkNguonKhac[];
  // Biên bản bàn giao
  ngay_ban_giao: string | null;
  dia_diem_ban_giao: string | null;
  ban_giao_ho_ten: string | null;
  ban_giao_chuc_vu: string | null;
  lam_chung_ho_ten: string | null;
  lam_chung_chuc_vu: string | null;
  so_quyet_dinh: string | null;
  ngay_quyet_dinh: string | null;
}

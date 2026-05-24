import type { MttqKhenThuongCap, MttqKhenThuongDanhHieu, MttqKhenThuongHinhThuc, MttqKhenThuongTrangThai } from './constants';

export interface MttqKhenThuongFilters {
  columnSearch: Record<string, string>;
  trang_thai: string[];
  /** YYYY từ `ngay_khen_thuong` */
  nam_khen_thuong: string[];
  /** Giá trị trim `don_vi_de_xuat` hoặc `__none__` */
  don_vi_de_xuat: string[];
  /** Hình thức khen — tab Chi tiết: từng dòng; tab Danh sách / Thống kê: QĐ có ít nhất một dòng khớp */
  hinh_thuc_khen: string[];
  /** Danh hiệu — cùng quy tắc `hinh_thuc_khen` */
  danh_hieu: string[];
  /** `var_nhan_vien.id_phong_ban` người tạo QĐ, hoặc `__none__` */
  id_phong_ban_nguoi_tao: string[];
}

/** Dòng chi tiết (bảng con), id string khi đã lưu DB. */
export interface MttqKhenThuongCt {
  id: string;
  id_khen_thuong: string;
  can_bo_id: string;
  cap_khen_thuong: MttqKhenThuongCap;
  hinh_thuc_khen: MttqKhenThuongHinhThuc;
  danh_hieu: MttqKhenThuongDanhHieu;
  noi_dung_khen: string | null;
  ho_so_khen: string | null;
  ten_can_bo?: string | null;
  /** `mttq_can_bo.don_vi_id` từ embed — phân quyền xem bảng con detail (cấp Xã). */
  can_bo_don_vi_id?: string | null;
  /** `mttq_can_bo.id_nguoi_tao` — phân quyền xem bảng con detail (cấp Xã). */
  can_bo_id_nguoi_tao?: string | null;
}

/** Bản ghi cha + danh sách con (đã join). */
export interface MttqKhenThuong {
  id: string;
  so_qd: string;
  ngay_khen_thuong: string;
  don_vi_de_xuat: string | null;
  ghi_chu: string | null;
  trang_thai: MttqKhenThuongTrangThai;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
  /** `var_nhan_vien.id_phong_ban` của người tạo — hiển thị / thống kê. */
  id_phong_ban_nguoi_tao?: string | null;
  chi_tiet: MttqKhenThuongCt[];
}

/** Dòng bảng danh sách — số lượng dòng con + tập `don_vi_id` cán bộ được khen (gate Xã). */
export interface MttqKhenThuongListRow extends Omit<MttqKhenThuong, 'chi_tiet'> {
  so_dong: number;
  rewarded_can_bo_don_vi_ids: string[];
  /** Giá trị `hinh_thuc_khen` xuất hiện trong ít nhất một dòng chi tiết (list API). */
  hinh_thuc_trong_qd: MttqKhenThuongHinhThuc[];
  danh_hieu_trong_qd: MttqKhenThuongDanhHieu[];
}

/**
 * Một dòng `mttq_khen_thuong_ct` + thông tin quyết định cha + cán bộ (tab Danh sách chi tiết).
 * `id` là id dòng chi tiết (CT), không phải id quyết định.
 */
export interface MttqKhenThuongChiTietFlatRow {
  id: string;
  id_khen_thuong: string;
  so_qd: string;
  ngay_khen_thuong: string;
  don_vi_de_xuat: string | null;
  trang_thai: MttqKhenThuongTrangThai;
  /** `tg_cap_nhat` của bản ghi cha — sort / lọc cột. */
  tg_cap_nhat_qd: string;
  /** `var_nhan_vien.id_phong_ban` của người tạo quyết định cha — hiển thị. */
  id_phong_ban_nguoi_tao: string | null;
  can_bo_id: string;
  ten_can_bo: string | null;
  cap_khen_thuong: MttqKhenThuongCap;
  hinh_thuc_khen: MttqKhenThuongHinhThuc;
  danh_hieu: MttqKhenThuongDanhHieu;
  noi_dung_khen: string | null;
  ho_so_khen: string | null;
  /** `id_nguoi_tao` quyết định cha — gate «dòng mình tạo» trên tab Chi tiết. */
  id_nguoi_tao: string;
  /** `mttq_can_bo.don_vi_id` người được khen trên dòng CT. */
  can_bo_don_vi_id: string | null;
}

/** Bộ lọc tab chi tiết — cùng shape với tab danh sách QĐ. */
export type MttqKhenThuongChiTietListFilters = MttqKhenThuongFilters;

/** Một dòng chi tiết khen thưởng gắn cán bộ + thông tin quyết định cha (đọc từ `mttq_khen_thuong_ct`). */
export interface MttqKhenThuongLineForCanBo {
  id_ct: string;
  id_khen_thuong: string;
  so_qd: string;
  ngay_khen_thuong: string;
  trang_thai: MttqKhenThuongTrangThai;
  cap_khen_thuong: MttqKhenThuongCap;
  hinh_thuc_khen: MttqKhenThuongHinhThuc;
  danh_hieu: MttqKhenThuongDanhHieu;
  noi_dung_khen: string | null;
  ho_so_khen: string | null;
}

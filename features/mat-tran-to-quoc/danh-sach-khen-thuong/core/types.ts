import type { MttqKhenThuongDanhHieu, MttqKhenThuongHinhThuc, MttqKhenThuongTrangThai } from './constants';

export interface MttqKhenThuongFilters {
  columnSearch: Record<string, string>;
  trang_thai: string[];
  /** YYYY từ `ngay_khen_thuong` */
  nam_khen_thuong: string[];
  /** Giá trị trim `don_vi_de_xuat` hoặc `__none__` */
  don_vi_de_xuat: string[];
}

/** Dòng chi tiết (bảng con), id string khi đã lưu DB. */
export interface MttqKhenThuongCt {
  id: string;
  id_khen_thuong: string;
  can_bo_id: string;
  hinh_thuc_khen: MttqKhenThuongHinhThuc;
  danh_hieu: MttqKhenThuongDanhHieu;
  noi_dung_khen: string | null;
  ho_so_khen: string | null;
  ten_can_bo?: string | null;
  /** `mttq_can_bo.don_vi_id` từ embed — phân quyền xem (cấp Xã). */
  can_bo_don_vi_id?: string | null;
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
  hinh_thuc_khen: MttqKhenThuongHinhThuc;
  danh_hieu: MttqKhenThuongDanhHieu;
  noi_dung_khen: string | null;
  ho_so_khen: string | null;
}

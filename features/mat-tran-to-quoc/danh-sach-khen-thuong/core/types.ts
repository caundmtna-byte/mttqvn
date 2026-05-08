import type { MttqKhenThuongDanhHieu, MttqKhenThuongHinhThuc, MttqKhenThuongTrangThai } from './constants';

export interface MttqKhenThuongFilters {
  columnSearch: Record<string, string>;
  trang_thai: string[];
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
  /** `var_nhan_vien.id_phong_ban` của người tạo — dùng cho gating phân quyền xem. */
  id_phong_ban_nguoi_tao?: string | null;
  chi_tiet: MttqKhenThuongCt[];
}

/** Dòng bảng danh sách — chỉ cần số lượng dòng con. */
export interface MttqKhenThuongListRow extends Omit<MttqKhenThuong, 'chi_tiet'> {
  so_dong: number;
}

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

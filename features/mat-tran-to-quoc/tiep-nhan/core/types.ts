import type { TnHinhThuc, TnMucDich, TnTrangThai } from './constants';

/** Một dòng phụ lục "Danh sách xác nhận của người được tài trợ". */
export interface TnPhuLucDong {
  ho_ten: string;
  dia_chi: string;
  quan_he: string;
  noi_dung_gia_tri: string;
}

/** Dòng danh sách — từ RPC `get_tn_tiep_nhan_page` (đã ghép tên, đã cộng giá trị phiếu kho). */
export interface TiepNhan {
  id: string;
  so_phieu: string;
  ngay_tiep_nhan: string;
  nha_tai_tro_id: string;
  ten_nha_tai_tro: string;
  loai_nha_tai_tro: string | null;
  chuong_trinh_id: string;
  ten_chuong_trinh: string;
  don_vi_chu_tri_loai: 'tinh' | 'xa_phuong';
  don_vi_chu_tri_id: string | null;
  /** "MTTQ tỉnh" hoặc tên xã — đơn vị tiếp nhận = đơn vị chủ trì chương trình. */
  ten_don_vi_tiep_nhan: string;
  hinh_thuc: TnHinhThuc | null;
  so_tien: number;
  giay_to_co_gia_gia_tri: number | null;
  hien_vat_khac_gia_tri: number | null;
  /** Σ thành tiền các phiếu nhập kho đã gắn. */
  gia_tri_phieu_kho: number;
  so_phieu_kho: number;
  tong_gia_tri: number;
  trang_thai: TnTrangThai;
  ngay_cap_nhat_trang_thai: string;
  ghi_chu: string | null;
  ho_va_ten_nguoi_tao: string | null;
  ten_tai_khoan_nguoi_tao: string | null;
  ho_va_ten_nguoi_cap_nhat: string | null;
  ten_tai_khoan_nguoi_cap_nhat: string | null;
  tg_tao: string;
  tg_cap_nhat: string;
}

/** Phiếu "Nhập từ ngoài" của một nhà tài trợ — RPC `get_tn_phieu_kho_cua_nha_tai_tro`. */
export interface TnPhieuKho {
  phieu_id: string;
  so_phieu: string;
  ngay_phieu: string;
  ten_kho: string | null;
  ten_chuong_trinh: string | null;
  tong_tien: number;
  so_dong: number;
  /** Khoản tiếp nhận đang giữ phiếu này (null = chưa gắn). */
  tiep_nhan_id: string | null;
  so_phieu_tiep_nhan: string | null;
}

/** Bản đầy đủ — chi tiết, form sửa, trang in. */
export interface TiepNhanFull extends TiepNhan {
  giay_to_co_gia_mo_ta: string | null;
  hien_vat_khac_mo_ta: string | null;
  muc_dich: TnMucDich[];
  dia_diem_lap: string | null;
  phu_luc: TnPhuLucDong[];
  phieu_kho: TnPhieuKho[];
}

export interface TiepNhanFilters {
  columnSearch: Record<string, string>;
  trang_thai_filter: string[];
  hinh_thuc_filter: string[];
  chuong_trinh_filter: string[];
  nha_tai_tro_filter: string[];
}

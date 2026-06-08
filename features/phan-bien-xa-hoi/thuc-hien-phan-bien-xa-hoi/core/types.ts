import type { CapThucHien, LoaiHinh, TinhTrang } from './constants';

export interface ThucHienPhanBienFilters {
  columnSearch: Record<string, string>;
  cap_thuc_hien_filter: string[];
  loai_hinh_filter: string[];
  tinh_trang_filter: string[];
  don_vi_chu_tri_filter: string[];
}

export interface ThucHienPhanBien {
  id: string;
  cap_thuc_hien: CapThucHien;
  loai_hinh: LoaiHinh;
  noi_dung: string;
  doi_tuong_id: string | null;
  ten_doi_tuong: string | null;
  hinh_thuc_id: string | null;
  ten_hinh_thuc: string | null;
  ngay_bat_dau: string | null;
  ngay_ket_thuc: string | null;
  mo_ta_thoi_gian: string | null;
  tinh_trang: TinhTrang;
  don_vi_chu_tri_id: string | null;
  ten_don_vi_chu_tri: string | null;
  phong_ban_tham_muu_id: string | null;
  ten_phong_ban: string | null;
  don_vi_thuc_hien_id: string | null;
  ten_don_vi_thuc_hien: string | null;
  ket_qua_kien_nghi: string | null;
  phan_tram_hoan_thanh: number;
  link_ket_qua: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
}

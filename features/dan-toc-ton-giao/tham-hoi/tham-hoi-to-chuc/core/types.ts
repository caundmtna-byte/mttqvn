import type { TienDoThamHoi } from './constants';

export interface ThamHoiToChucFilters {
  columnSearch: Record<string, string>;
  tien_do_filter: string[];
  to_chuc_filter: string[];
}

export interface ThamHoiToChuc {
  id: string;
  to_chuc_id: string;
  ten_co_so: string | null;
  loai_hinh: string | null;
  dip_tham_hoi: string;
  thoi_gian_du_kien: string | null;
  don_vi_tham_hoi: string | null;
  noi_dung_tham_hoi: string | null;
  thanh_phan_doan: string | null;
  qua_tang: string | null;
  tien_do: TienDoThamHoi;
  ket_qua_thuc_hien: string | null;
  link_ket_qua: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
}

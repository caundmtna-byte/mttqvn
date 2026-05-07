/** Khớp bảng `var_ssn_tinh_thanh` (Supabase int8 id → chuỗi ở client). */
export interface TinhThanh {
  id: string;
  ten: string;
  thu_tu: number;
  tg_tao: string;
  tg_cap_nhat: string;
  /** Chỉ gắn khi tải danh sách: số xã/phường trực thuộc. */
  so_xa_phuong?: number;
}

/** Khớp bảng `var_ssn_xa_phuong` — FK `id_tinh_thanh`. */
export interface XaPhuong {
  id: string;
  id_tinh_thanh: string;
  ten: string;
  thu_tu: number;
  tg_tao: string;
  tg_cap_nhat: string;
}

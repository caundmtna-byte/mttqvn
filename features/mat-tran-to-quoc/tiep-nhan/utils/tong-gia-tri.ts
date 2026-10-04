/**
 * Giá trị một khoản tiếp nhận = tiền + giấy tờ có giá + hiện vật khác + phiếu kho gắn.
 * Bản sao công thức `tong_gia_tri` trong RPC `get_tn_tiep_nhan_page` và luật
 * "khoản phải có giá trị" trong `rpc_tn_luu_tiep_nhan` — sửa một bên phải sửa cả bên kia.
 */
export interface TnThanhPhanGiaTri {
  so_tien?: number | null;
  giay_to_co_gia_gia_tri?: number | null;
  hien_vat_khac_gia_tri?: number | null;
  gia_tri_phieu_kho?: number | null;
}

const n = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function tongGiaTriTiepNhan(v: TnThanhPhanGiaTri): number {
  return n(v.so_tien) + n(v.giay_to_co_gia_gia_tri) + n(v.hien_vat_khac_gia_tri) + n(v.gia_tri_phieu_kho);
}

/** Phần hiện vật (in dòng "Hiện vật … quy ra trị giá VND") = hàng kho gắn + hiện vật khác. */
export function giaTriHienVatTiepNhan(v: Pick<TnThanhPhanGiaTri, 'hien_vat_khac_gia_tri' | 'gia_tri_phieu_kho'>): number {
  return n(v.hien_vat_khac_gia_tri) + n(v.gia_tri_phieu_kho);
}

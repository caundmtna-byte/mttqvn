/**
 * Luật tiền của Nhà đại đoàn kết — bản sao `so_tien NOT NULL`
 * (migration `20261004200000_tien_bat_buoc_cho_phep_0`). Sửa một bên phải sửa cả bên kia.
 *
 * Mọi hồ sơ, ở mọi trạng thái, phải nhập số tiền; được nhập 0 (số âm do zod chặn riêng).
 */
/** True ⇒ chưa nhập tiền (để trống hoặc không phải số). */
export function nddkThieuTien(soTien: number | null | undefined): boolean {
  return typeof soTien !== 'number' || Number.isNaN(soTien);
}

/**
 * "Ủng hộ trực tiếp" = nhà tài trợ trao thẳng cho hộ ⇒ phải chọn nhà tài trợ, vì
 * khoản này được cộng vào Kết quả hỗ trợ của nhà tài trợ đó. Nguồn khác thì ô Nhà
 * tài trợ bị khoá và để trống.
 *
 * Chương trình hỗ trợ dùng thẳng hàm này — bản sao CHECK `vnn_don_vi_ho_tro_theo_nguon_chk`.
 */
export const NGUON_HO_TRO_TRUC_TIEP = 'Ủng hộ trực tiếp';

export function canNhaTaiTro(nguonHoTro: string | null | undefined): boolean {
  return nguonHoTro === NGUON_HO_TRO_TRUC_TIEP;
}

/** Nguồn "Giới thiệu" của Nhà đại đoàn kết: hộ do một nhà tài trợ giới thiệu/nhận đỡ. */
export const NDDK_NGUON_GIOI_THIEU = 'Giới thiệu';

/**
 * Nhà đại đoàn kết chặt hơn: phải ĐỒNG THỜI Nguồn = "Giới thiệu" và Nguồn hỗ trợ =
 * "Ủng hộ trực tiếp" mới chọn (và bắt buộc chọn) nhà tài trợ.
 * Bản sao CHECK `nddk_nha_tai_tro_theo_nguon_chk` — sửa một bên phải sửa cả bên kia.
 */
export function nddkCanNhaTaiTro(
  nguon: string | null | undefined,
  nguonHoTro: string | null | undefined,
): boolean {
  return nguon === NDDK_NGUON_GIOI_THIEU && canNhaTaiTro(nguonHoTro);
}

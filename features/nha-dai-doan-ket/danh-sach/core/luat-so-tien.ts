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
 * khoản này được cộng vào Kết quả hỗ trợ của nhà tài trợ đó. Dùng chung cho NĐĐK và
 * Chương trình hỗ trợ.
 */
export const NGUON_HO_TRO_TRUC_TIEP = 'Ủng hộ trực tiếp';

export function canNhaTaiTro(nguonHoTro: string | null | undefined): boolean {
  return nguonHoTro === NGUON_HO_TRO_TRUC_TIEP;
}

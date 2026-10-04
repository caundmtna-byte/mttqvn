import type { NddkTrangThai } from './constants';

/**
 * Luật tiền của Nhà đại đoàn kết — bản sao CHECK `nddk_so_tien_theo_trang_thai_chk`
 * (migration `20261004120000_nddk_nha_tai_tro_tien_bat_buoc`). Sửa một bên phải sửa
 * cả bên kia.
 *
 * Hồ sơ "Đang khảo sát" / "Tạm dừng" chưa chốt mức nên được để trống; từ khi đã
 * phê duyệt trở đi phải có số tiền cụ thể để cộng tổng ủng hộ.
 */
export const NDDK_TRANG_THAI_BAT_BUOC_TIEN: readonly NddkTrangThai[] = [
  'Đã phê duyệt',
  'Đang thực hiện',
  'Đã bàn giao',
];

export function nddkTrangThaiCanTien(trangThai: string | null | undefined): boolean {
  return (NDDK_TRANG_THAI_BAT_BUOC_TIEN as readonly string[]).includes(trangThai ?? '');
}

/** True ⇒ thiếu tiền ở trạng thái bắt buộc (null, 0 hoặc không phải số đều tính là thiếu). */
export function nddkThieuTien(trangThai: string | null | undefined, soTien: number | null | undefined): boolean {
  return nddkTrangThaiCanTien(trangThai) && !(typeof soTien === 'number' && soTien > 0);
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

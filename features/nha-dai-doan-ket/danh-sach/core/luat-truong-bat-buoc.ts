/**
 * Trường biên bản bắt buộc theo trạng thái hồ sơ Nhà đại đoàn kết.
 *
 * **Bản sao ở client của trigger `fn_nddk_kiem_truong_bat_buoc`**
 * (migration `20261010100000_nddk_truong_bat_buoc_theo_trang_thai`). DB chỉ kiểm
 * lúc thêm mới / lúc đổi trạng thái; form Sửa thì luôn kiểm để hồ sơ cũ được làm
 * đầy dần. Sửa một bên phải sửa cả bên kia.
 *
 * - "Đang khảo sát": ngày khảo sát.
 * - "Đã bàn giao": ngày kiểm tra hoàn thành + ngày bàn giao; thêm số + ngày quyết
 *   định nếu nguồn hỗ trợ là Cấp tỉnh / Cấp xã / Trung ương ("Ủng hộ trực tiếp"
 *   không có quyết định hỗ trợ).
 */

/** Liệt kê dương: thêm nguồn mới thì không tự bị đòi quyết định. */
export const NDDK_NGUON_CAN_QUYET_DINH: readonly string[] = ['Cấp tỉnh', 'Cấp xã', 'Trung ương'];

export type NddkTruongBatBuoc =
  | 'ngay_khao_sat'
  | 'ngay_kiem_tra_hoan_thanh'
  | 'ngay_ban_giao'
  | 'so_quyet_dinh'
  | 'ngay_quyet_dinh';

export function nddkTruongBatBuoc(
  trangThai: string | null | undefined,
  nguonHoTro: string | null | undefined,
): NddkTruongBatBuoc[] {
  const t = (trangThai ?? '').trim();
  if (t === 'Đang khảo sát') return ['ngay_khao_sat'];
  if (t === 'Đã bàn giao') {
    const truong: NddkTruongBatBuoc[] = ['ngay_kiem_tra_hoan_thanh', 'ngay_ban_giao'];
    if (NDDK_NGUON_CAN_QUYET_DINH.includes((nguonHoTro ?? '').trim())) {
      truong.push('so_quyet_dinh', 'ngay_quyet_dinh');
    }
    return truong;
  }
  return [];
}

/** Trường bắt buộc còn trống (chuỗi chỉ có khoảng trắng coi là trống). */
export function nddkTruongConThieu(
  trangThai: string | null | undefined,
  nguonHoTro: string | null | undefined,
  values: Partial<Record<NddkTruongBatBuoc, string | null | undefined>>,
): NddkTruongBatBuoc[] {
  return nddkTruongBatBuoc(trangThai, nguonHoTro).filter((k) => !(values[k] ?? '').trim());
}

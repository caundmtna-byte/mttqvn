/**
 * Ô biên bản bàn giao bắt buộc theo trạng thái khoản hỗ trợ (Chương trình hỗ trợ).
 *
 * **Bản sao ở client của trigger `fn_vnn_kiem_truong_bat_buoc`**
 * (migration `20261010110000_vnn_truong_bat_buoc_theo_trang_thai`). DB chỉ kiểm
 * lúc thêm mới / lúc đổi trạng thái; form Sửa thì luôn kiểm. Sửa một bên phải sửa
 * cả bên kia.
 *
 * - "Đã nhận": ngày bàn giao; thêm số + ngày quyết định nếu nguồn hỗ trợ là
 *   Cấp tỉnh / Cấp xã / Trung ương (cùng danh sách với Nhà đại đoàn kết).
 *
 * Ba ô này nằm trong jsonb `bien_ban_ban_giao`, không phải cột riêng.
 */
import { NDDK_NGUON_CAN_QUYET_DINH } from '../../danh-sach/core/luat-truong-bat-buoc';

export type VnnTruongBatBuoc = 'ngay_ban_giao' | 'so_quyet_dinh' | 'ngay_quyet_dinh';

export function vnnTruongBatBuoc(
  trangThai: string | null | undefined,
  nguonHoTro: string | null | undefined,
): VnnTruongBatBuoc[] {
  if ((trangThai ?? '').trim() !== 'Đã nhận') return [];
  return NDDK_NGUON_CAN_QUYET_DINH.includes((nguonHoTro ?? '').trim())
    ? ['ngay_ban_giao', 'so_quyet_dinh', 'ngay_quyet_dinh']
    : ['ngay_ban_giao'];
}

/** Ô bắt buộc còn trống (chuỗi chỉ có khoảng trắng coi là trống). */
export function vnnTruongConThieu(
  trangThai: string | null | undefined,
  nguonHoTro: string | null | undefined,
  bienBan: Partial<Record<VnnTruongBatBuoc, string | null | undefined>> | null | undefined,
): VnnTruongBatBuoc[] {
  return vnnTruongBatBuoc(trangThai, nguonHoTro).filter((k) => !(bienBan?.[k] ?? '').trim());
}

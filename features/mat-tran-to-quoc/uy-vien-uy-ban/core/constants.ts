/** Trạng thái tham gia ủy viên ủy ban — chỉ hai giá trị nghiệp vụ. */
export const MTTQ_UY_VIEN_TRANG_THAM_GIA = ['Đang tham gia', 'Thôi tham gia'] as const;

export type MttqUyVienTrangThamGia = (typeof MTTQ_UY_VIEN_TRANG_THAM_GIA)[number];

export const MTTQ_UY_VIEN_TRANG_THAM_GIA_DANG: MttqUyVienTrangThamGia = 'Đang tham gia';
export const MTTQ_UY_VIEN_TRANG_THAM_GIA_THOI: MttqUyVienTrangThamGia = 'Thôi tham gia';

export function normalizeUyVienTrangThamGia(
  value: string | null | undefined,
): MttqUyVienTrangThamGia {
  const t = value?.trim();
  if (t === MTTQ_UY_VIEN_TRANG_THAM_GIA_THOI) return MTTQ_UY_VIEN_TRANG_THAM_GIA_THOI;
  return MTTQ_UY_VIEN_TRANG_THAM_GIA_DANG;
}

export function isUyVienTrangThamGia(value: string | null | undefined): value is MttqUyVienTrangThamGia {
  const t = value?.trim();
  return t === MTTQ_UY_VIEN_TRANG_THAM_GIA_DANG || t === MTTQ_UY_VIEN_TRANG_THAM_GIA_THOI;
}

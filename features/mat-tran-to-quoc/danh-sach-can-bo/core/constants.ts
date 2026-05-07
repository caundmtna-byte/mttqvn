export const MTTQ_CAN_BO_GIOI_TINH = ['Nam', 'Nữ', 'Khác'] as const;
export type MttqCanBoGioiTinh = (typeof MTTQ_CAN_BO_GIOI_TINH)[number];

/** Giá trị filter khi `trang_thai_id` null (không trùng id thật). */
export const CHIP_TRANG_THAI_NULL = '__null__' as const;

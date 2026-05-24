export const MTTQ_CAN_BO_GIOI_TINH = ['Nam', 'Nữ', 'Khác'] as const;
export type MttqCanBoGioiTinh = (typeof MTTQ_CAN_BO_GIOI_TINH)[number];

/** Giá trị lưu DB / form — có theo tôn giáo hay không. */
export const MTTQ_CAN_BO_TON_GIAO = ['Có', 'Không'] as const;
export type MttqCanBoTonGiao = (typeof MTTQ_CAN_BO_TON_GIAO)[number];

export const MTTQ_CAN_BO_TON_GIAO_DEFAULT: MttqCanBoTonGiao = 'Không';

/** Giá trị filter khi FK / trạng thái null (không trùng id thật). */
export const CHIP_TRANG_THAI_NULL = '__null__' as const;
export const CHIP_FILTER_NULL = CHIP_TRANG_THAI_NULL;

/** Giá trị chip lọc cột Đảng viên (không trùng UUID). */
export const CHIP_DANG_VIEN_YES = '__dv_yes__' as const;
export const CHIP_DANG_VIEN_NO = '__dv_no__' as const;
